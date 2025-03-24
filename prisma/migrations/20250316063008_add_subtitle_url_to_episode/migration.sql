/*
  Warnings:

  - You are about to drop the column `text` on the `subtitles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "episode" ADD COLUMN     "subtitleEnUrl" VARCHAR(255),
ADD COLUMN     "subtitleZhUrl" VARCHAR(255);

-- AlterTable
ALTER TABLE "subtitles" DROP COLUMN "text",
ADD COLUMN     "en" TEXT,
ADD COLUMN     "zh" TEXT;
