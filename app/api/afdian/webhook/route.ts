import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";

const AFDIAN_WEBHOOK_SECRET =
  process.env.AFDIAN_WEBHOOK_SECRET || "YuanluSecret_2026_Prod";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "Unknown";
  console.log(`[Webhook] Received request from IP: ${ip}`);

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
        // 开发环境宽限放行
        if (process.env.NODE_ENV !== "production") {
          isAuthenticated = true;
          authReason = "签名不匹配 (开发环境宽限放行)";
        }
      }
    } else {
      // 本地环境无鉴权宽限放行
      if (process.env.NODE_ENV !== "production") {
        isAuthenticated = true;
        authReason = "未包含鉴权 Token (开发环境宽限放行)";
      }
    }

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

    if (!out_trade_no) {
      return NextResponse.json(
        { ec: 400, em: "缺少交易单号" },
        { status: 400 },
      );
    }

    // 从留言中提取邮箱
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const remarkStr = String(remark).trim();
    const matchedEmails = remarkStr.match(emailRegex);

    let targetEmail = "";
    if (matchedEmails && matchedEmails.length > 0) {
      targetEmail = matchedEmails[0].toLowerCase();
    } else if (remarkStr.includes("@")) {
      targetEmail = remarkStr.toLowerCase();
    }

    if (!targetEmail) {
      console.warn(`[Webhook] 无效的邮箱留言: ${remark}`);
      return NextResponse.json({
        ec: 200,
        em: "ok",
        detail: "订单处理完成但未激活 (无有效邮箱留言)",
      });
    }

    // 激活逻辑
    const matched = await prisma.user.findUnique({
      where: { email: targetEmail },
    });
    if (!matched) {
      console.warn(`[Webhook] 未找到用户邮箱: ${targetEmail}`);
      return NextResponse.json({
        ec: 200,
        em: "ok",
        detail: "订单处理完成但未激活 (未找到匹配的用户)",
      });
    }

    // 计算开通天数
    let daysAdded = 0;
    const amt = parseFloat(total_amount.toString());

    if (Math.abs(amt - 5) < 0.1) {
      daysAdded = 7;
    } else if (Math.abs(amt - 18) < 0.1) {
      daysAdded = 30;
    } else if (Math.abs(amt - 48) < 0.1) {
      daysAdded = 90;
    } else if (Math.abs(amt - 168) < 0.1) {
      daysAdded = 365;
    } else {
      if (amt >= 168) {
        daysAdded = Math.floor(amt * (365 / 168));
      } else if (amt >= 48) {
        daysAdded = Math.floor(amt * (90 / 48));
      } else if (amt >= 18) {
        daysAdded = Math.floor(amt * (30 / 18));
      } else if (amt >= 5) {
        daysAdded = Math.floor(amt * (7 / 5));
      } else {
        daysAdded = Math.floor(amt * 1);
      }
    }

    // 更新或创建订阅
    let currentExpiryTimestamp = Date.now();
    const activeSub = await prisma.subscriptions.findFirst({
      where: {
        userid: matched.userid,
        subscriptionType: "PREMIUM",
        endDate: { gt: new Date() },
      },
      orderBy: { endDate: "desc" },
    });

    if (activeSub?.endDate) {
      const existing = activeSub.endDate.getTime();
      if (existing > Date.now()) {
        currentExpiryTimestamp = existing;
      }
    }

    const newExpiryDate = new Date(
      currentExpiryTimestamp + daysAdded * 24 * 60 * 60 * 1000,
    );

    await prisma.$transaction(async (tx) => {
      // 1. 新增订阅记录（这里我们为了保留历史，直接新增一条或延期现有订阅。为了简化，我们像 YuanluVIP 一样创建一条新记录，或者采用 setting 的逻辑：更新现有）
      if (activeSub) {
        await tx.subscriptions.update({
          where: { subscriptionid: activeSub.subscriptionid },
          data: { endDate: newExpiryDate },
        });
      } else {
        await tx.subscriptions.create({
          data: {
            userid: matched.userid,
            subscriptionType: "PREMIUM",
            startDate: new Date(),
            endDate: newExpiryDate,
          },
        });
      }

      // 2. 更新用户角色
      await tx.user.update({
        where: { userid: matched.userid },
        data: { role: "PREMIUM" },
      });
    });

    console.log(
      `[Webhook] 成功激活用户 ${targetEmail} 的 ${daysAdded} 天 VIP 权益。新到期时间: ${newExpiryDate.toISOString()}`,
    );

    return NextResponse.json({
      ec: 200,
      em: "ok",
      data: {
        activated: true,
        email: targetEmail,
        daysAdded,
        newExpiry: newExpiryDate.toISOString(),
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
