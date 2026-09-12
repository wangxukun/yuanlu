-- CreateTable
-- 收藏句子（句子本）：episodeid + startTime/endTime 保留原音上下文，
-- subtitleId 支持影子跟读定位，tags 为用户自定义标签数组
CREATE TABLE "SavedSentence" (
    "id" SERIAL NOT NULL,
    "userid" TEXT NOT NULL,
    "episodeid" TEXT NOT NULL,
    "subtitleId" INTEGER,
    "startTime" DOUBLE PRECISION NOT NULL,
    "endTime" DOUBLE PRECISION NOT NULL,
    "enText" TEXT NOT NULL,
    "zhText" TEXT,
    "note" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "SavedSentence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SavedSentence_userid_episodeid_subtitleId_key" ON "SavedSentence"("userid", "episodeid", "subtitleId");

-- CreateIndex
CREATE INDEX "SavedSentence_userid_createAt_idx" ON "SavedSentence"("userid", "createAt" DESC);

-- CreateIndex
CREATE INDEX "SavedSentence_userid_episodeid_idx" ON "SavedSentence"("userid", "episodeid");

-- AddForeignKey
ALTER TABLE "SavedSentence" ADD CONSTRAINT "SavedSentence_episodeid_fkey" FOREIGN KEY ("episodeid") REFERENCES "episode"("episodeid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedSentence" ADD CONSTRAINT "SavedSentence_userid_fkey" FOREIGN KEY ("userid") REFERENCES "User"("userid") ON DELETE CASCADE ON UPDATE CASCADE;
