-- AlterTable
ALTER TABLE "episode" ADD COLUMN     "playCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "podcast" ADD COLUMN     "followerCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalPlays" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "podcast_totalPlays_idx" ON "podcast"("totalPlays" DESC);
