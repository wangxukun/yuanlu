-- CreateTable
-- 词典查询配额计数：免费用户每日查询计数（有道 API / LLM 词典缓存未命中）
CREATE TABLE "dictionary_lookups" (
    "id" TEXT NOT NULL,
    "userid" TEXT NOT NULL,
    "source" VARCHAR(50),
    "word" VARCHAR(255),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dictionary_lookups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dictionary_lookups_userid_createdAt_idx" ON "dictionary_lookups"("userid" DESC, "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "dictionary_lookups" ADD CONSTRAINT "dictionary_lookups_userid_fkey" FOREIGN KEY ("userid") REFERENCES "User"("userid") ON DELETE CASCADE ON UPDATE CASCADE;
