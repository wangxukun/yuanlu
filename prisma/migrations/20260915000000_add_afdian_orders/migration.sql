-- CreateTable
-- 爱发电订单流水（P0-2）：out_trade_no 唯一索引为 Webhook 幂等闸门，
-- 并为 P2-3 未匹配订单暂存/管理员认领提供数据基础
CREATE TABLE "AfdianOrder" (
    "orderid" SERIAL NOT NULL,
    "outTradeNo" VARCHAR(64) NOT NULL,
    "userid" TEXT,
    "planId" VARCHAR(64),
    "amount" DECIMAL(10,2) NOT NULL,
    "daysGranted" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(30) NOT NULL,
    "remark" TEXT,
    "createAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AfdianOrder_pkey" PRIMARY KEY ("orderid")
);

-- CreateIndex
CREATE UNIQUE INDEX "AfdianOrder_outTradeNo_key" ON "AfdianOrder"("outTradeNo");

-- CreateIndex
CREATE INDEX "AfdianOrder_userid_createAt_idx" ON "AfdianOrder"("userid", "createAt" DESC);

-- CreateIndex
CREATE INDEX "AfdianOrder_status_createAt_idx" ON "AfdianOrder"("status", "createAt" DESC);
