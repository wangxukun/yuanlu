-- CreateTable
-- 转化事件埋点：会员弹窗打开 / 配额拦截 / 试用触墙
CREATE TABLE "conversion_events" (
    "id" TEXT NOT NULL,
    "eventType" VARCHAR(50) NOT NULL,
    "source" VARCHAR(100),
    "userid" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversion_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversion_events_eventType_createdAt_idx" ON "conversion_events"("eventType" DESC, "createdAt" DESC);

-- CreateIndex
CREATE INDEX "conversion_events_userid_createdAt_idx" ON "conversion_events"("userid" DESC, "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "conversion_events" ADD CONSTRAINT "conversion_events_userid_fkey" FOREIGN KEY ("userid") REFERENCES "User"("userid") ON DELETE SET NULL ON UPDATE CASCADE;
