-- AlterTable
ALTER TABLE "podcast" ADD COLUMN     "createAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "podcast_createAt_idx" ON "podcast"("createAt" DESC);
