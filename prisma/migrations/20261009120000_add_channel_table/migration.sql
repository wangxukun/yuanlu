-- 频道运营表：按 podcast.platform 聚合的品牌横幅 OSS key 与排序
-- CreateTable
CREATE TABLE "channel" (
    "channelid" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "coverFileName" VARCHAR(255),
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "channel_pkey" PRIMARY KEY ("channelid")
);

-- CreateIndex
CREATE UNIQUE INDEX "channel_name_key" ON "channel"("name");

-- CreateIndex
CREATE INDEX "channel_sortOrder_idx" ON "channel"("sortOrder");
