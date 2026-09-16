import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { resolvePlanGrant } from "@/lib/afdian-plans";

/**
 * 爱发电订单认领与激活共享服务（P2-3）。
 *
 * Webhook 自动匹配、管理员认领、用户自助找回三条路径全部经由
 * applyOrderGrant 同一管道完成「白名单计费 → 订阅续期 → 订单终态写回」，
 * 防止认领路径绕开 P0-2 的幂等账本与 W4 白名单规则形成口径分叉。
 */

/** 有钱但未加时的订单状态：待认领池（AfdianOrder 即暂存账本） */
export const CLAIMABLE_STATUSES = ["NO_REMARK", "UNMATCHED_USER"] as const;
export type ClaimableStatus = (typeof CLAIMABLE_STATUSES)[number];

export type OrderActivationResult =
  | { status: "NON_PLAN_SPONSOR" | "AMOUNT_MISMATCH" }
  | {
      status: "ACTIVATED";
      userid: string;
      daysAdded: number;
      newExpiryDate: Date;
      isRenewal: boolean;
    };

export class OrderClaimError extends Error {
  constructor(
    public code:
      | "ORDER_NOT_FOUND"
      | "ORDER_ALREADY_HANDLED"
      | "ORDER_NOT_CLAIMABLE"
      | "CONCURRENT_CLAIM",
    message: string,
  ) {
    super(message);
    this.name = "OrderClaimError";
  }
}

/**
 * 白名单计费 + 订阅续期 + 订单终态写回的核心管道。
 * - Webhook：匹配到用户后调用（无 CAS，订单行由本请求事务内 create 独占）；
 * - 认领（管理员/自助）：绑定用户后调用（requireClaimable CAS，仅允许
 *   待认领状态流转，并发双认领在此互斥）。
 */
export async function applyOrderGrant(
  tx: Prisma.TransactionClient,
  input: {
    outTradeNo: string;
    planId: string | null;
    amount: number;
    userid: string;
    claim?: { claimedBy?: string | null; requireClaimable?: boolean };
  },
): Promise<OrderActivationResult> {
  // [P0-2/W4] 套餐白名单计费：时长只按 plan_id 发放，金额须为单价整数倍；
  // 认领路径同受约束——管理员不能凭面板给赞助单/金额不符单手工加时
  const grant = resolvePlanGrant(input.planId, input.amount);
  if (grant.status !== "ACTIVATED") {
    await finalizeOrder(
      tx,
      input.outTradeNo,
      {
        userid: input.userid,
        status: grant.status,
      },
      input.claim,
    );
    return { status: grant.status };
  }

  // 订阅续期：在剩余时长上累加而非覆盖（保留原有正确行为）
  const now = Date.now();
  const activeSub = await tx.subscriptions.findFirst({
    where: {
      userid: input.userid,
      subscriptionType: "PREMIUM",
      endDate: { gt: new Date() },
    },
    orderBy: { endDate: "desc" },
  });

  const currentExpiryTimestamp = activeSub?.endDate
    ? Math.max(activeSub.endDate.getTime(), now)
    : now;
  const newExpiryDate = new Date(
    currentExpiryTimestamp + grant.days * 24 * 60 * 60 * 1000,
  );

  if (activeSub) {
    await tx.subscriptions.update({
      where: { subscriptionid: activeSub.subscriptionid },
      data: { endDate: newExpiryDate },
    });
  } else {
    await tx.subscriptions.create({
      data: {
        userid: input.userid,
        subscriptionType: "PREMIUM",
        startDate: new Date(),
        endDate: newExpiryDate,
      },
    });
  }

  // 注意：只写订阅记录，不再永久打标 role="PREMIUM"（P0-1）——
  // 执行口径统一走 isPremiumUser 的"有效订阅"判定。

  await finalizeOrder(
    tx,
    input.outTradeNo,
    {
      userid: input.userid,
      status: "ACTIVATED",
      daysGranted: grant.days,
    },
    input.claim,
  );

  return {
    status: "ACTIVATED",
    userid: input.userid,
    daysAdded: grant.days,
    newExpiryDate,
    isRenewal: !!activeSub,
  };
}

async function finalizeOrder(
  tx: Prisma.TransactionClient,
  outTradeNo: string,
  data: { userid: string; status: string; daysGranted?: number },
  claim?: { claimedBy?: string | null; requireClaimable?: boolean },
): Promise<void> {
  const writeData = {
    userid: data.userid,
    status: data.status,
    ...(data.daysGranted !== undefined
      ? { daysGranted: data.daysGranted }
      : {}),
    ...(claim
      ? { claimedBy: claim.claimedBy ?? null, claimedAt: new Date() }
      : {}),
  };

  if (claim?.requireClaimable) {
    // CAS：只有仍处于待认领状态的订单才允许被认领流转。
    // 两个管理员并发认领 / 自助找回与管理员认领并发时，仅一方 count=1。
    const res = await tx.afdianOrder.updateMany({
      where: { outTradeNo, status: { in: [...CLAIMABLE_STATUSES] } },
      data: writeData,
    });
    if (res.count === 0) {
      throw new OrderClaimError(
        "CONCURRENT_CLAIM",
        "订单已被其他认领操作处理，请刷新后重试",
      );
    }
  } else {
    await tx.afdianOrder.update({
      where: { outTradeNo },
      data: writeData,
    });
  }
}

/**
 * 认领入口（管理员面板 / 用户自助找回共用）：
 * 校验订单可认领后，在事务内经 applyOrderGrant 完成激活。
 */
export async function claimAndActivateOrder(input: {
  orderId?: number;
  outTradeNo?: string;
  userid: string;
  /** 执行认领的管理员 userid；自助找回路径传 null */
  claimedBy?: string | null;
}): Promise<OrderActivationResult> {
  return prisma.$transaction(async (tx) => {
    const order = input.orderId
      ? await tx.afdianOrder.findUnique({
          where: { orderid: input.orderId },
        })
      : await tx.afdianOrder.findUnique({
          where: { outTradeNo: input.outTradeNo! },
        });

    if (!order) {
      throw new OrderClaimError("ORDER_NOT_FOUND", "订单不存在");
    }
    if (order.status === "ACTIVATED") {
      throw new OrderClaimError("ORDER_ALREADY_HANDLED", "该订单已激活过会员");
    }
    if (!(CLAIMABLE_STATUSES as readonly string[]).includes(order.status)) {
      throw new OrderClaimError(
        "ORDER_NOT_CLAIMABLE",
        `订单状态为 ${order.status}（未按套餐支付或金额不符），无法认领加时，需人工线下处理`,
      );
    }

    return applyOrderGrant(tx, {
      outTradeNo: order.outTradeNo,
      planId: order.planId,
      amount: order.amount.toNumber(),
      userid: input.userid,
      claim: {
        claimedBy: input.claimedBy ?? null,
        requireClaimable: true,
      },
    });
  });
}

/**
 * 留言模糊归属预检（自助找回自动通道）：
 * Webhook 三步精确匹配（userid → 邮箱 → 手机号）失败后，用户主动提交
 * 订单号时，用"去符号子串匹配"识别"UID：xxx"、"电话 138-xxxx"等变体留言。
 * 标识符最短 6 位（cuid 25 位 / 手机号 11 位 / 邮箱 ≥6 位），排除短串误配。
 */
export function remarkMatchesUser(
  remark: string,
  user: { userid: string; email?: string | null; phone?: string | null },
): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const normalizedRemark = normalize(remark);
  if (!normalizedRemark) return false;

  return [user.userid, user.email, user.phone]
    .filter((id): id is string => !!id)
    .some((id) => id.length >= 6 && normalizedRemark.includes(normalize(id)));
}

/**
 * 自助找回无法自动归属时登记申请：管理端据此优先人工核对。
 * 写回仅当订单仍待认领，不覆盖已被处理订单。
 */
export async function markClaimRequested(
  outTradeNo: string,
  userid: string,
): Promise<void> {
  await prisma.afdianOrder.updateMany({
    where: { outTradeNo, status: { in: [...CLAIMABLE_STATUSES] } },
    data: { claimRequestedBy: userid, claimRequestedAt: new Date() },
  });
}
