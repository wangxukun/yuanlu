-- [模块E T3.1] User 微信身份绑定字段（微信虚拟支付前置，SUBSCRIBE-TASK）：
-- wxOpenId 唯一约束 = 一个微信号只能绑定一个自建账号（防一号多绑套权益）；
-- wxSessionKey 即签即用（下单窗口内 code2Session 现换取用，不依赖长效）；
-- 既有用户无绑定时为 NULL。幂等性由 _prisma_migrations 应用记录保证
-- （与既有 46 个迁移同口径，migrate deploy 不重复应用）。
ALTER TABLE "User" ADD COLUMN "wxOpenId" VARCHAR(64);
ALTER TABLE "User" ADD COLUMN "wxSessionKey" VARCHAR(128);

-- CreateIndex
CREATE UNIQUE INDEX "User_wxOpenId_key" ON "User"("wxOpenId");
