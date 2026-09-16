import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/core/auth/guard";
import {
  claimAndActivateOrder,
  markClaimRequested,
  remarkMatchesUser,
  OrderClaimError,
  CLAIMABLE_STATUSES,
} from "@/core/afdian/order-claim.service";
import { notificationService } from "@/core/notification/notification.service";
import { formatChineseDate } from "@/lib/tools";
import { recordConversionEvent } from "@/lib/track";

/**
 * [P2-3] 用户自助找回：支付成功但会员未到账（留言 UID 被改动/删除）时，
 * 用户凭爱发电订单号自助认领。归属判定（满足其一即可自动激活）：
 *   1. 订单留言模糊包含本人标识（UID/邮箱/手机号，去符号子串匹配）；
 *   2. 补充的支付金额与订单金额完全一致（订单号 + 金额双重付款凭证）。
 * 无法自动归属时登记找回申请，由管理员在认领面板人工核对。
 */
export async function POST(req: Request) {
  const guard = await requireAuth();
  if (!guard.ok) return guard.response;
  const me = guard.session.user;

  try {
    const body = await req.json();
    const outTradeNo = String(body?.outTradeNo || "").trim();
    if (!outTradeNo || outTradeNo.length > 64) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_INPUT",
          error: "请输入有效的爱发电订单号",
        },
        { status: 400 },
      );
    }
    const amountInput = Number(body?.amount);

    const order = await prisma.afdianOrder.findUnique({
      where: { outTradeNo },
    });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          code: "ORDER_NOT_FOUND",
          error:
            "未找到该订单。请到爱发电「我的-记录」中复制完整的商户订单号后重试",
        },
        { status: 404 },
      );
    }

    if (order.status === "ACTIVATED") {
      if (order.userid === me.userid) {
        return NextResponse.json({
          success: true,
          code: "ALREADY_ACTIVATED",
          message: "该订单的会员权益已经到账，无需找回",
        });
      }
      // 不泄露订单归属细节，防枚举探测
      return NextResponse.json(
        {
          success: false,
          code: "ORDER_TAKEN",
          error: "该订单已被处理。若您认为有误，请联系客服人工核对",
        },
        { status: 409 },
      );
    }

    if (!(CLAIMABLE_STATUSES as readonly string[]).includes(order.status)) {
      return NextResponse.json(
        {
          success: false,
          code: "NOT_CLAIMABLE",
          error:
            "该订单未按会员套餐支付（自定义赞助或金额不符），无法自动加时，请联系客服处理",
        },
        { status: 422 },
      );
    }

    // 归属判定：留言模糊匹配 或 订单号+金额双凭证
    const remarkMatch =
      order.status === "UNMATCHED_USER" && order.remark
        ? remarkMatchesUser(order.remark, {
            userid: me.userid,
            email: me.email,
            phone: me.phone ?? null,
          })
        : false;
    const amountMatch =
      Number.isFinite(amountInput) &&
      amountInput > 0 &&
      Math.abs(amountInput - order.amount.toNumber()) < 0.01;

    if (!remarkMatch && !amountMatch) {
      // 无法自动归属：登记申请转人工，管理端认领面板会置顶提示
      await markClaimRequested(outTradeNo, me.userid);
      return NextResponse.json(
        {
          success: false,
          code: "PROOF_REQUIRED",
          needAmount: true,
          error:
            "订单留言与您的账号不匹配。请在下方补充该笔订单的准确支付金额（爱发电记录中可查）后再次提交；若仍失败，我们已为您登记人工找回申请，管理员会尽快核对",
        },
        { status: 400 },
      );
    }

    let result;
    try {
      result = await claimAndActivateOrder({
        orderId: order.orderid,
        userid: me.userid,
        claimedBy: null,
      });
    } catch (claimError) {
      if (claimError instanceof OrderClaimError) {
        const status =
          claimError.code === "CONCURRENT_CLAIM"
            ? 409
            : claimError.code === "ORDER_NOT_FOUND"
              ? 404
              : 422;
        return NextResponse.json(
          { success: false, code: claimError.code, error: claimError.message },
          { status },
        );
      }
      throw claimError;
    }

    if (result.status !== "ACTIVATED") {
      return NextResponse.json(
        {
          success: false,
          code: result.status,
          error: "该订单未按会员套餐支付，无法自动加时，请联系客服处理",
        },
        { status: 422 },
      );
    }

    const formattedExpiry = formatChineseDate(result.newExpiryDate);
    try {
      await notificationService.createNotification({
        userid: me.userid,
        notificationText: `【系统通知】您的付款已自助找回成功，会员资格已${result.isRenewal ? "延长" : "激活"}至${formattedExpiry}！`,
        type: "SYSTEM",
        targetUrl: "/auth/subscribe",
      });
    } catch (notifyError) {
      console.error("[Recover] 发送找回成功通知失败:", notifyError);
    }

    await recordConversionEvent({
      eventType: "SUBSCRIPTION_RECOVERED",
      source: "self_service",
      userid: me.userid,
      metadata: { orderId: order.orderid, daysAdded: result.daysAdded },
    });

    return NextResponse.json({
      success: true,
      code: "ACTIVATED",
      daysAdded: result.daysAdded,
      newExpiry: result.newExpiryDate.toISOString(),
      isRenewal: result.isRenewal,
    });
  } catch (error) {
    console.error("[POST /api/user/subscription/recover] Error:", error);
    return NextResponse.json(
      { success: false, error: "服务器内部错误" },
      { status: 500 },
    );
  }
}
