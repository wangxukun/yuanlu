import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/core/auth/guard";
import {
  claimAndActivateOrder,
  OrderClaimError,
} from "@/core/afdian/order-claim.service";
import { notificationService } from "@/core/notification/notification.service";
import { formatChineseDate } from "@/lib/tools";
import { recordConversionEvent } from "@/lib/track";

/**
 * [P2-3] 管理员认领：将待认领订单绑定到指定用户并激活。
 * 激活走与 Webhook 相同的共享 service（applyOrderGrant），
 * 同受幂等账本与 W4 白名单计费约束。
 */
export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const admin = guard.session.user;

  try {
    const body = await req.json();
    const orderId = Number(body?.orderId);
    const userid = String(body?.userid || "").trim();

    if (!Number.isInteger(orderId) || !userid) {
      return NextResponse.json(
        { success: false, error: "参数不完整（orderId / userid）" },
        { status: 400 },
      );
    }

    // 校验绑定目标用户存在，避免给幽灵账号加时
    const targetUser = await prisma.user.findUnique({
      where: { userid },
      select: { userid: true, email: true },
    });
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "目标用户不存在，请核对 UID" },
        { status: 404 },
      );
    }

    let result;
    try {
      result = await claimAndActivateOrder({
        orderId,
        userid,
        claimedBy: admin.userid,
      });
    } catch (claimError) {
      if (claimError instanceof OrderClaimError) {
        const status =
          claimError.code === "ORDER_NOT_FOUND"
            ? 404
            : claimError.code === "CONCURRENT_CLAIM"
              ? 409
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
          error:
            result.status === "AMOUNT_MISMATCH"
              ? "订单金额与套餐单价不符（非整数倍），白名单计费拒绝加时，需人工线下处理"
              : "订单无有效套餐凭据（自定义赞助），只入账不加时",
        },
        { status: 422 },
      );
    }

    // 与 Webhook 同款的到账通知（认领场景补充人工核对说明）
    const formattedExpiry = formatChineseDate(result.newExpiryDate);
    try {
      await notificationService.createNotification({
        userid,
        notificationText: `【系统通知】您此前无法自动匹配的付款已经管理员核对认领，会员资格已${result.isRenewal ? "延长" : "激活"}至${formattedExpiry}！`,
        type: "SYSTEM",
        targetUrl: "/auth/subscribe",
      });
    } catch (notifyError) {
      console.error("[AdminClaim] 发送认领通知失败:", notifyError);
    }

    await recordConversionEvent({
      eventType: "SUBSCRIPTION_RECOVERED",
      source: "admin_claim",
      userid,
      metadata: { orderId, daysAdded: result.daysAdded },
    });

    return NextResponse.json({
      success: true,
      activated: true,
      daysAdded: result.daysAdded,
      newExpiry: result.newExpiryDate.toISOString(),
      isRenewal: result.isRenewal,
    });
  } catch (error) {
    console.error("[POST /api/admin/afdian/claim] Error:", error);
    return NextResponse.json(
      { success: false, error: "服务器内部错误" },
      { status: 500 },
    );
  }
}
