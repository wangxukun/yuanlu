import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { notificationService } from "@/core/notification/notification.service";
import { formatChineseDate } from "@/lib/tools";
import {
  applyOrderGrant,
  type OrderActivationResult,
} from "@/core/afdian/order-claim.service";

// [P0-2/W2] 密钥只认环境变量：源码中不再存在任何默认值。
// env 漏配时直接拒绝处理（fail-closed），而不是带着公开默认密钥静默放行伪造回调。
const AFDIAN_WEBHOOK_SECRET = process.env.AFDIAN_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "Unknown";
  console.log(`[Webhook] Received request from IP: ${ip}`);

  if (!AFDIAN_WEBHOOK_SECRET) {
    console.error(
      "[Webhook] AFDIAN_WEBHOOK_SECRET 未配置，拒绝处理回调（fail-closed）",
    );
    return NextResponse.json(
      { ec: 500, em: "服务器未配置回调密钥，拒绝处理" },
      { status: 500 },
    );
  }

  try {
    const rawBody = await req.json();
    let payload = rawBody;

    // 解析 body
    if (rawBody && rawBody.request_json) {
      if (typeof rawBody.request_json === "string") {
        payload = JSON.parse(rawBody.request_json);
      } else {
        payload = rawBody.request_json;
      }
    }

    // 获取 URL 参数和 Header 签名
    const url = new URL(req.url);
    const queryToken = url.searchParams.get("token");
    const signatureHeader = req.headers.get("x-afdian-signature");
    const signatureParam =
      payload.sign || url.searchParams.get("sign") || rawBody.sign;

    let isAuthenticated = false;
    let authReason = "";

    // A: Token 匹配
    if (queryToken && queryToken === AFDIAN_WEBHOOK_SECRET) {
      isAuthenticated = true;
      authReason = "URL Token验证成功";
    }
    // B: 签名匹配
    else if (signatureHeader || signatureParam) {
      const receivedSign = signatureHeader || signatureParam;
      const plainString =
        AFDIAN_WEBHOOK_SECRET + JSON.stringify(payload.data || payload);
      const expectedSign = crypto
        .createHash("md5")
        .update(plainString)
        .digest("hex");

      const alternativePlain =
        AFDIAN_WEBHOOK_SECRET + (payload.data?.order?.out_trade_no || "");
      const alternativeSign = crypto
        .createHash("md5")
        .update(alternativePlain)
        .digest("hex");

      if (receivedSign === expectedSign || receivedSign === alternativeSign) {
        isAuthenticated = true;
        authReason = "MD5签名验证成功";
      } else {
        authReason = "签名不匹配";
      }
    } else {
      authReason = "未包含鉴权 Token";
    }

    // [P0-2/W3] 所有环境强制鉴权：移除"非 production 宽限放行"分支。
    // NODE_ENV 误配不再等价于免费充值入口。
    if (!isAuthenticated) {
      console.error("[Webhook] Auth failed:", authReason);
      return NextResponse.json(
        { ec: 401, em: `鉴权失败: ${authReason}` },
        { status: 401 },
      );
    }

    // 检查订单数据
    const data = payload.data;
    if (!data || data.type !== "order" || !data.order) {
      return NextResponse.json({
        ec: 200,
        em: "ok",
        detail: "忽略非订单通知类型",
      });
    }

    const order = data.order;
    const out_trade_no = order.out_trade_no;
    const remark = order.remark || "";
    const total_amount = order.total_amount;
    const planId = order.plan_id ? String(order.plan_id) : null;

    if (!out_trade_no) {
      return NextResponse.json(
        { ec: 400, em: "缺少交易单号" },
        { status: 400 },
      );
    }

    const remarkStr = String(remark).trim();
    const parsedAmt = parseFloat(total_amount.toString());
    const amount = Number.isFinite(parsedAmt) ? parsedAmt : 0;

    // [P0-2/W1+W4] 幂等 + 匹配 + 白名单计费 + 激活 收敛进同一个事务：
    // 1. 订单先落库（outTradeNo 唯一索引）——create 成功即独占该笔交易的处理权，
    //    爱发电重试/重放触发唯一冲突（P2002），按已处理直接返回，重复加时不可能发生；
    // 2. 任一中间步骤抛错则整体回滚，订单不会残留在半处理状态；
    // 3. 无留言/未匹配/非套餐赞助同样入账（status 区分），为 P2-3 认领面板留好数据。
    let result: Awaited<ReturnType<typeof processOrder>>;
    try {
      result = await prisma.$transaction(async (tx) =>
        processOrder(tx, {
          outTradeNo: out_trade_no,
          remarkStr,
          planId,
          amount,
        }),
      );
    } catch (txError) {
      if (
        txError instanceof Prisma.PrismaClientKnownRequestError &&
        txError.code === "P2002"
      ) {
        console.warn(`[Webhook] 重复回调（幂等拦截）: ${out_trade_no}`);
        return NextResponse.json({
          ec: 200,
          em: "ok",
          detail: "重复回调，已按幂等忽略",
        });
      }
      throw txError;
    }

    if (result.status !== "ACTIVATED") {
      console.warn(
        `[Webhook] 订单 ${out_trade_no} 已入账但未激活 (${result.status})`,
      );
      return NextResponse.json({
        ec: 200,
        em: "ok",
        detail: `订单已入账，未激活 (${result.status})`,
      });
    }

    console.log(
      `[Webhook] 成功激活用户 ${result.userid} 的 ${result.daysAdded} 天 VIP 权益。新到期时间: ${result.newExpiryDate.toISOString()}`,
    );

    // Send in-app system notification to the user
    const formattedExpiry = formatChineseDate(result.newExpiryDate);
    const notificationMessage = result.isRenewal
      ? `【系统恭喜】您的付款已被爱发电成功捕获！会员资格已延长至${formattedExpiry}！`
      : "【系统恭喜】您的付款已被爱发电成功捕获！会员资格已秒级自动充值并生效激活！";

    try {
      await notificationService.createNotification({
        userid: result.userid,
        notificationText: notificationMessage,
        type: "SYSTEM",
        targetUrl: "/auth/subscribe",
      });
      console.log(`[Webhook] 已向用户 ${result.userid} 发送充值成功系统通知`);
    } catch (notifyError) {
      // Notification failure should not block the webhook response
      console.error("[Webhook] 发送系统通知失败:", notifyError);
    }

    return NextResponse.json({
      ec: 200,
      em: "ok",
      data: {
        activated: true,
        userid: result.userid,
        daysAdded: result.daysAdded,
        newExpiry: result.newExpiryDate.toISOString(),
      },
    });
  } catch (error) {
    console.error("[Webhook] 处理回调时发生错误:", error);
    return NextResponse.json(
      { ec: 500, em: "服务器内部错误" },
      { status: 500 },
    );
  }
}

type OrderTxClient = Prisma.TransactionClient;

/**
 * 单笔订单的事务化处理：入账 → 匹配用户 → 激活。
 * 每个非激活分支都会把订单状态写清后正常返回（提交事务），
 * 保证任何一笔进来的订单在 AfdianOrder 表里都有可追溯的终态。
 */
async function processOrder(
  tx: OrderTxClient,
  input: {
    outTradeNo: string;
    remarkStr: string;
    planId: string | null;
    amount: number;
  },
): Promise<OrderActivationResult | { status: "NO_REMARK" | "UNMATCHED_USER" }> {
  // 幂等闸门：唯一索引冲突（P2002）由调用方捕获并按重放处理
  await tx.afdianOrder.create({
    data: {
      outTradeNo: input.outTradeNo,
      planId: input.planId,
      amount: input.amount,
      remark: input.remarkStr || null,
      status: "RECEIVED",
    },
  });

  // 无留言凭证：入账待认领（P2-3 管理员面板 / 自助找回的数据基础）
  if (!input.remarkStr) {
    console.warn(`[Webhook] 无效的空留言: ${input.outTradeNo}`);
    await tx.afdianOrder.update({
      where: { outTradeNo: input.outTradeNo },
      data: { status: "NO_REMARK" },
    });
    return { status: "NO_REMARK" };
  }

  // 留言三步匹配：完整 userid → 邮箱（向下兼容历史预填）→ 手机号
  let matched = await tx.user.findUnique({
    where: { userid: input.remarkStr },
  });

  if (!matched) {
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const matchedEmails = input.remarkStr.match(emailRegex);
    let targetEmail = "";
    if (matchedEmails && matchedEmails.length > 0) {
      targetEmail = matchedEmails[0].toLowerCase();
    } else if (input.remarkStr.includes("@")) {
      targetEmail = input.remarkStr.toLowerCase();
    }

    if (targetEmail) {
      matched = await tx.user.findUnique({
        where: { email: targetEmail },
      });
    }
  }

  if (!matched) {
    matched = await tx.user.findUnique({
      where: { phone: input.remarkStr },
    });
  }

  if (!matched) {
    console.warn(`[Webhook] 未找到匹配的用户: ${input.remarkStr}`);
    await tx.afdianOrder.update({
      where: { outTradeNo: input.outTradeNo },
      data: { status: "UNMATCHED_USER" },
    });
    return { status: "UNMATCHED_USER" };
  }

  // [P2-3] 白名单计费 + 订阅激活统一走共享 service：Webhook 自动匹配与
  // 管理员认领/用户自助找回共用同一管道（applyOrderGrant），口径永不分叉
  return applyOrderGrant(tx, {
    outTradeNo: input.outTradeNo,
    planId: input.planId,
    amount: input.amount,
    userid: matched.userid,
  });
}
