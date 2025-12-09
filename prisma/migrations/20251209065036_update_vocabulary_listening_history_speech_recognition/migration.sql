/*
  Warnings:

  - A unique constraint covering the columns `[userid,episodeid]` on the table `listening_history` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "listening_history" ADD COLUMN     "isFinished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "progressSeconds" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "speech_recognition" ADD COLUMN     "targetStartTime" INTEGER,
ADD COLUMN     "targetText" TEXT;

-- AlterTable
ALTER TABLE "vocabulary" ADD COLUMN     "contextSentence" TEXT,
ADD COLUMN     "episodeid" TEXT,
ADD COLUMN     "nextReviewAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "proficiency" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "timestamp" INTEGER,
ADD COLUMN     "translation" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "listening_history_userid_episodeid_key" ON "listening_history"("userid", "episodeid");

-- CreateIndex
CREATE INDEX "vocabulary_userid_episodeid_idx" ON "vocabulary"("userid", "episodeid");
