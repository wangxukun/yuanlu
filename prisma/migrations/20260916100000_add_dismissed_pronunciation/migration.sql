-- P2-4 发音弱项"已攻克"标记表：打标移除而非软删评测流水，
-- 标记后出现新的低分评测时句子自动重回弱项本
CREATE TABLE "dismissed_pronunciation" (
    "id" SERIAL NOT NULL,
    "userid" TEXT NOT NULL,
    "targetText" TEXT NOT NULL,
    "dismissedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dismissed_pronunciation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dismissed_pronunciation_userid_targetText_key" ON "dismissed_pronunciation"("userid", "targetText");

-- CreateIndex
CREATE INDEX "dismissed_pronunciation_userid_dismissedAt_idx" ON "dismissed_pronunciation"("userid", "dismissedAt" DESC);

-- AddForeignKey
ALTER TABLE "dismissed_pronunciation" ADD CONSTRAINT "dismissed_pronunciation_userid_fkey" FOREIGN KEY ("userid") REFERENCES "User"("userid") ON DELETE CASCADE ON UPDATE NO ACTION;
