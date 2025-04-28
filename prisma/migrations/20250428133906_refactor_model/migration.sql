/*
  Warnings:

  - You are about to drop the column `createdAt` on the `captcha` table. All the data in the column will be lost.
  - You are about to drop the column `podcastid` on the `comments` table. All the data in the column will be lost.
  - You are about to drop the column `podcastid` on the `discussion_threads` table. All the data in the column will be lost.
  - You are about to drop the column `categoryid` on the `episode` table. All the data in the column will be lost.
  - You are about to drop the column `podcastid` on the `listening_history` table. All the data in the column will be lost.
  - You are about to drop the column `podcastid` on the `quizzes` table. All the data in the column will be lost.
  - You are about to drop the column `podcastid` on the `ratings` table. All the data in the column will be lost.
  - You are about to drop the column `ratingvalue` on the `ratings` table. All the data in the column will be lost.
  - You are about to drop the column `accuracyscore` on the `speech_recognition` table. All the data in the column will be lost.
  - You are about to drop the column `podcastid` on the `speech_recognition` table. All the data in the column will be lost.
  - You are about to drop the column `speechtext` on the `speech_recognition` table. All the data in the column will be lost.
  - You are about to drop the `category` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `favorites` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `subtitles` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "category" DROP CONSTRAINT "category_parentCategoryid_fkey";

-- DropForeignKey
ALTER TABLE "comments" DROP CONSTRAINT "comments_podcastid_fkey";

-- DropForeignKey
ALTER TABLE "discussion_threads" DROP CONSTRAINT "discussion_threads_podcastid_fkey";

-- DropForeignKey
ALTER TABLE "episode" DROP CONSTRAINT "episode_categoryid_fkey";

-- DropForeignKey
ALTER TABLE "favorites" DROP CONSTRAINT "favorites_podcastid_fkey";

-- DropForeignKey
ALTER TABLE "favorites" DROP CONSTRAINT "favorites_userid_fkey";

-- DropForeignKey
ALTER TABLE "listening_history" DROP CONSTRAINT "listening_history_podcastid_fkey";

-- DropForeignKey
ALTER TABLE "quizzes" DROP CONSTRAINT "quizzes_podcastid_fkey";

-- DropForeignKey
ALTER TABLE "ratings" DROP CONSTRAINT "ratings_podcastid_fkey";

-- DropForeignKey
ALTER TABLE "speech_recognition" DROP CONSTRAINT "speech_recognition_podcastid_fkey";

-- DropForeignKey
ALTER TABLE "subtitles" DROP CONSTRAINT "subtitles_podcastid_fkey";

-- AlterTable
ALTER TABLE "captcha" DROP COLUMN "createdAt",
ADD COLUMN     "createAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "comments" DROP COLUMN "podcastid",
ADD COLUMN     "episodeid" TEXT;

-- AlterTable
ALTER TABLE "discussion_threads" DROP COLUMN "podcastid",
ADD COLUMN     "episodeid" TEXT;

-- AlterTable
ALTER TABLE "episode" DROP COLUMN "categoryid",
ADD COLUMN     "podcastid" TEXT;

-- AlterTable
ALTER TABLE "listening_history" DROP COLUMN "podcastid",
ADD COLUMN     "episodeid" TEXT;

-- AlterTable
ALTER TABLE "quizzes" DROP COLUMN "podcastid",
ADD COLUMN     "episodeid" TEXT;

-- AlterTable
ALTER TABLE "ratings" DROP COLUMN "podcastid",
DROP COLUMN "ratingvalue",
ADD COLUMN     "episodeid" TEXT,
ADD COLUMN     "ratingValue" INTEGER;

-- AlterTable
ALTER TABLE "speech_recognition" DROP COLUMN "accuracyscore",
DROP COLUMN "podcastid",
DROP COLUMN "speechtext",
ADD COLUMN     "accuracyScore" DOUBLE PRECISION,
ADD COLUMN     "episodeid" TEXT,
ADD COLUMN     "speechText" TEXT;

-- DropTable
DROP TABLE "category";

-- DropTable
DROP TABLE "favorites";

-- DropTable
DROP TABLE "subtitles";

-- CreateTable
CREATE TABLE "podcast" (
    "podcastid" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "coverUrl" VARCHAR(255) NOT NULL DEFAULT 'default_cover_url',
    "coverFileName" VARCHAR(255),
    "platform" VARCHAR(255),
    "description" TEXT,
    "parentPodcastid" TEXT,

    CONSTRAINT "podcast_pkey" PRIMARY KEY ("podcastid")
);

-- CreateTable
CREATE TABLE "episode_favorites" (
    "favoriteid" SERIAL NOT NULL,
    "userid" TEXT,
    "episodeid" TEXT,
    "favoriteDate" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "episode_favorites_pkey" PRIMARY KEY ("favoriteid")
);

-- CreateTable
CREATE TABLE "podcast_favorites" (
    "favoriteid" SERIAL NOT NULL,
    "userid" TEXT,
    "podcastid" TEXT,
    "favoriteDate" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "podcast_favorites_pkey" PRIMARY KEY ("favoriteid")
);

-- CreateTable
CREATE TABLE "tag" (
    "tagid" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "createAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tag_pkey" PRIMARY KEY ("tagid")
);

-- CreateTable
CREATE TABLE "podcast_tags" (
    "id" SERIAL NOT NULL,
    "podcastid" TEXT NOT NULL,
    "tagid" TEXT NOT NULL,

    CONSTRAINT "podcast_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "episode_tags" (
    "id" SERIAL NOT NULL,
    "episodeid" TEXT NOT NULL,
    "tagid" TEXT NOT NULL,

    CONSTRAINT "episode_tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "podcast_title_key" ON "podcast"("title");

-- CreateIndex
CREATE UNIQUE INDEX "episode_favorites_userid_episodeid_key" ON "episode_favorites"("userid", "episodeid");

-- CreateIndex
CREATE UNIQUE INDEX "podcast_favorites_userid_podcastid_key" ON "podcast_favorites"("userid", "podcastid");

-- CreateIndex
CREATE UNIQUE INDEX "tag_name_key" ON "tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "podcast_tags_podcastid_tagid_key" ON "podcast_tags"("podcastid", "tagid");

-- CreateIndex
CREATE UNIQUE INDEX "episode_tags_episodeid_tagid_key" ON "episode_tags"("episodeid", "tagid");

-- AddForeignKey
ALTER TABLE "podcast" ADD CONSTRAINT "podcast_parentPodcastid_fkey" FOREIGN KEY ("parentPodcastid") REFERENCES "podcast"("podcastid") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_episodeid_fkey" FOREIGN KEY ("episodeid") REFERENCES "episode"("episodeid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_episodeid_fkey" FOREIGN KEY ("episodeid") REFERENCES "episode"("episodeid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "episode" ADD CONSTRAINT "episode_podcastid_fkey" FOREIGN KEY ("podcastid") REFERENCES "podcast"("podcastid") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "episode_favorites" ADD CONSTRAINT "episode_favorites_episodeid_fkey" FOREIGN KEY ("episodeid") REFERENCES "episode"("episodeid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "episode_favorites" ADD CONSTRAINT "episode_favorites_userid_fkey" FOREIGN KEY ("userid") REFERENCES "User"("userid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "podcast_favorites" ADD CONSTRAINT "podcast_favorites_podcastid_fkey" FOREIGN KEY ("podcastid") REFERENCES "podcast"("podcastid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "podcast_favorites" ADD CONSTRAINT "podcast_favorites_userid_fkey" FOREIGN KEY ("userid") REFERENCES "User"("userid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "podcast_tags" ADD CONSTRAINT "podcast_tags_podcastid_fkey" FOREIGN KEY ("podcastid") REFERENCES "podcast"("podcastid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "podcast_tags" ADD CONSTRAINT "podcast_tags_tagid_fkey" FOREIGN KEY ("tagid") REFERENCES "tag"("tagid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episode_tags" ADD CONSTRAINT "episode_tags_episodeid_fkey" FOREIGN KEY ("episodeid") REFERENCES "episode"("episodeid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episode_tags" ADD CONSTRAINT "episode_tags_tagid_fkey" FOREIGN KEY ("tagid") REFERENCES "tag"("tagid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listening_history" ADD CONSTRAINT "listening_history_episodeid_fkey" FOREIGN KEY ("episodeid") REFERENCES "episode"("episodeid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_episodeid_fkey" FOREIGN KEY ("episodeid") REFERENCES "episode"("episodeid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_episodeid_fkey" FOREIGN KEY ("episodeid") REFERENCES "episode"("episodeid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "speech_recognition" ADD CONSTRAINT "speech_recognition_episodeid_fkey" FOREIGN KEY ("episodeid") REFERENCES "episode"("episodeid") ON DELETE CASCADE ON UPDATE NO ACTION;
