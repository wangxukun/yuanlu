-- P2-3 认领元数据：AfdianOrder 兼任未匹配订单暂存账本，
-- 补充管理员认领与用户自助找回申请的追溯字段
ALTER TABLE "AfdianOrder" ADD COLUMN "claimedBy" TEXT;
ALTER TABLE "AfdianOrder" ADD COLUMN "claimedAt" TIMESTAMPTZ(6);
ALTER TABLE "AfdianOrder" ADD COLUMN "claimRequestedBy" TEXT;
ALTER TABLE "AfdianOrder" ADD COLUMN "claimRequestedAt" TIMESTAMPTZ(6);
