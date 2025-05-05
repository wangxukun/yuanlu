/*
  Warnings:

  - The primary key for the `episode_tags` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `episode_tags` table. All the data in the column will be lost.
  - The primary key for the `podcast_tags` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `podcast_tags` table. All the data in the column will be lost.
  - You are about to drop the column `createAt` on the `tag` table. All the data in the column will be lost.
  - Added the required column `type` to the `tag` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "tag_type" AS ENUM ('podcast', 'episode', 'UNIVERSAL');

-- DropIndex
DROP INDEX "episode_tags_episodeid_tagid_key";

-- DropIndex
DROP INDEX "podcast_tags_podcastid_tagid_key";

-- AlterTable
ALTER TABLE "episode_tags" DROP CONSTRAINT "episode_tags_pkey",
DROP COLUMN "id",
ADD COLUMN     "createAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
ADD CONSTRAINT "episode_tags_pkey" PRIMARY KEY ("episodeid", "tagid");

-- AlterTable
ALTER TABLE "podcast_tags" DROP CONSTRAINT "podcast_tags_pkey",
DROP COLUMN "id",
ADD COLUMN     "createAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
ADD CONSTRAINT "podcast_tags_pkey" PRIMARY KEY ("podcastid", "tagid");

-- AlterTable
ALTER TABLE "tag" DROP COLUMN "createAt",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "type" "tag_type" NOT NULL;
