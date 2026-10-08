/**
 * core/subscription/grant.service.ts — 高级会员订阅续期核心（模块 E T4.4 抽取）
 *
 * 从 afdian/order-claim.service.ts 的 applyOrderGrant 中抽取的共享管道：
 * 在当前剩余时长上累加而非覆盖；无有效订阅则新建行。爱发电激活与
 * 微信虚拟支付发货（wxpay/notify.service）两条渠道共用本函数延长
 * subscriptions——同一会员事实不分叉（SUBSCRIBE-TASK 1.3 口径红线）。
 * 只写订阅记录，不永久打标 role（P0-1，isPremiumUser 按有效订阅判定）。
 */
import type { Prisma } from "@prisma/client";

export interface SubscriptionExtendResult {
  newExpiryDate: Date;
  isRenewal: boolean;
}

/** 在 userid 的 PREMIUM 有效订阅剩余时长上累加 days 天（无则新建）。须在事务内调用。 */
export async function extendPremiumSubscription(
  tx: Prisma.TransactionClient,
  userid: string,
  days: number,
): Promise<SubscriptionExtendResult> {
  // [SUBSCRIBE-TASK 1.3] 同一 userid 的并发发放（手动设置双击提交、爱发电
  // 认领与虚拟支付发货同时到达）在此串行：事务级咨询锁（惯例同
  // learning-path/sentences）。不加锁时"先读后写"会丢失更新——两次 +30 天
  // 只落一次；锁等待在事务提交后释放，后到者读到新 endDate 再叠加。
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userid}))`;

  const now = Date.now();
  const activeSub = await tx.subscriptions.findFirst({
    where: {
      userid,
      subscriptionType: "PREMIUM",
      endDate: { gt: new Date() },
    },
    orderBy: { endDate: "desc" },
  });

  const currentExpiryTimestamp = activeSub?.endDate
    ? Math.max(activeSub.endDate.getTime(), now)
    : now;
  const newExpiryDate = new Date(
    currentExpiryTimestamp + days * 24 * 60 * 60 * 1000,
  );

  if (activeSub) {
    await tx.subscriptions.update({
      where: { subscriptionid: activeSub.subscriptionid },
      data: { endDate: newExpiryDate },
    });
  } else {
    await tx.subscriptions.create({
      data: {
        userid,
        subscriptionType: "PREMIUM",
        startDate: new Date(),
        endDate: newExpiryDate,
      },
    });
  }

  return { newExpiryDate, isRenewal: !!activeSub };
}
