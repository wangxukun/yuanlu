-- [模块E T4.3] 微信虚拟支付订单流水（同构 AfdianOrder 账本职责）：
-- out_trade_no 唯一 = 商户单号（8-32 位，下单生成）；
-- wx_order_id 可空唯一 = 发货推送幂等闸门（平台重试/重放拦截，T4.4 回填）；
-- 金额恒为分且只来自 SKU 表（amountFen = 单价分 × buyQuantity），不收前端价。
ALTER TABLE "User" ADD CONSTRAINT "WxpayOrder_userid_fkey" FOREIGN KEY ("userid") REFERENCES "User"("userid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- CreateTable
CREATE TABLE "WxpayOrder" (
    "orderid" SERIAL NOT NULL,
    "outTradeNo" VARCHAR(32) NOT NULL,
    "wxOrderId" VARCHAR(64),
    "userid" TEXT,
    "planKey" VARCHAR(20) NOT NULL,
    "productId" VARCHAR(64) NOT NULL,
    "buyQuantity" INTEGER NOT NULL,
    "amountFen" INTEGER NOT NULL,
    "daysGranted" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(30) NOT NULL,
    "createAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "WxpayOrder_pkey" PRIMARY KEY ("orderid")
);

-- CreateIndex
CREATE UNIQUE INDEX "WxpayOrder_outTradeNo_key" ON "WxpayOrder"("outTradeNo");

-- CreateIndex
CREATE UNIQUE INDEX "WxpayOrder_wxOrderId_key" ON "WxpayOrder"("wxOrderId");

-- CreateIndex
CREATE INDEX "WxpayOrder_userid_createAt_idx" ON "WxpayOrder"("userid", "createAt" DESC);

-- CreateIndex
CREATE INDEX "WxpayOrder_status_createAt_idx" ON "WxpayOrder"("status", "createAt" DESC);
