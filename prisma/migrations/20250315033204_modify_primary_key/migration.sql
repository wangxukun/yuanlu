/*
  Warnings:

  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `episode` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `user_profile` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "achievements" DROP CONSTRAINT "achievements_userid_fkey";

-- DropForeignKey
ALTER TABLE "comments" DROP CONSTRAINT "comments_podcastid_fkey";

-- DropForeignKey
ALTER TABLE "comments" DROP CONSTRAINT "comments_userid_fkey";

-- DropForeignKey
ALTER TABLE "discussion_threads" DROP CONSTRAINT "discussion_threads_podcastid_fkey";

-- DropForeignKey
ALTER TABLE "discussion_threads" DROP CONSTRAINT "discussion_threads_userid_fkey";

-- DropForeignKey
ALTER TABLE "episode" DROP CONSTRAINT "episode_uploaderid_fkey";

-- DropForeignKey
ALTER TABLE "favorites" DROP CONSTRAINT "favorites_podcastid_fkey";

-- DropForeignKey
ALTER TABLE "favorites" DROP CONSTRAINT "favorites_userid_fkey";

-- DropForeignKey
ALTER TABLE "learning_paths" DROP CONSTRAINT "learning_paths_userid_fkey";

-- DropForeignKey
ALTER TABLE "listening_history" DROP CONSTRAINT "listening_history_podcastid_fkey";

-- DropForeignKey
ALTER TABLE "listening_history" DROP CONSTRAINT "listening_history_userid_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_userid_fkey";

-- DropForeignKey
ALTER TABLE "quizzes" DROP CONSTRAINT "quizzes_podcastid_fkey";

-- DropForeignKey
ALTER TABLE "ratings" DROP CONSTRAINT "ratings_podcastid_fkey";

-- DropForeignKey
ALTER TABLE "ratings" DROP CONSTRAINT "ratings_userid_fkey";

-- DropForeignKey
ALTER TABLE "speech_recognition" DROP CONSTRAINT "speech_recognition_podcastid_fkey";

-- DropForeignKey
ALTER TABLE "speech_recognition" DROP CONSTRAINT "speech_recognition_userid_fkey";

-- DropForeignKey
ALTER TABLE "study_groups" DROP CONSTRAINT "study_groups_creatorid_fkey";

-- DropForeignKey
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_userid_fkey";

-- DropForeignKey
ALTER TABLE "subtitles" DROP CONSTRAINT "subtitles_podcastid_fkey";

-- DropForeignKey
ALTER TABLE "user_profile" DROP CONSTRAINT "user_profile_userid_fkey";

-- DropForeignKey
ALTER TABLE "vocabulary" DROP CONSTRAINT "vocabulary_userid_fkey";

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
ALTER COLUMN "userid" DROP DEFAULT,
ALTER COLUMN "userid" SET DATA TYPE TEXT,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("userid");
DROP SEQUENCE "User_userid_seq";

-- AlterTable
ALTER TABLE "achievements" ALTER COLUMN "userid" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "comments" ALTER COLUMN "userid" SET DATA TYPE TEXT,
ALTER COLUMN "podcastid" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "discussion_threads" ALTER COLUMN "podcastid" SET DATA TYPE TEXT,
ALTER COLUMN "userid" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "episode" DROP CONSTRAINT "episode_pkey",
ALTER COLUMN "episodeid" DROP DEFAULT,
ALTER COLUMN "episodeid" SET DATA TYPE TEXT,
ALTER COLUMN "uploaderid" SET DATA TYPE TEXT,
ADD CONSTRAINT "episode_pkey" PRIMARY KEY ("episodeid");
DROP SEQUENCE "episode_episodeid_seq";

-- AlterTable
ALTER TABLE "favorites" ALTER COLUMN "userid" SET DATA TYPE TEXT,
ALTER COLUMN "podcastid" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "learning_paths" ALTER COLUMN "userid" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "listening_history" ALTER COLUMN "userid" SET DATA TYPE TEXT,
ALTER COLUMN "podcastid" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "notifications" ALTER COLUMN "userid" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "quizzes" ALTER COLUMN "podcastid" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "ratings" ALTER COLUMN "userid" SET DATA TYPE TEXT,
ALTER COLUMN "podcastid" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "speech_recognition" ALTER COLUMN "userid" SET DATA TYPE TEXT,
ALTER COLUMN "podcastid" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "study_groups" ALTER COLUMN "creatorid" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "subscriptions" ALTER COLUMN "userid" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "subtitles" ALTER COLUMN "podcastid" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "user_profile" DROP CONSTRAINT "user_profile_pkey",
ALTER COLUMN "userid" SET DATA TYPE TEXT,
ADD CONSTRAINT "user_profile_pkey" PRIMARY KEY ("userid");

-- AlterTable
ALTER TABLE "vocabulary" ALTER COLUMN "userid" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_userid_fkey" FOREIGN KEY ("userid") REFERENCES "User"("userid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_podcastid_fkey" FOREIGN KEY ("podcastid") REFERENCES "episode"("episodeid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_userid_fkey" FOREIGN KEY ("userid") REFERENCES "User"("userid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_podcastid_fkey" FOREIGN KEY ("podcastid") REFERENCES "episode"("episodeid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_userid_fkey" FOREIGN KEY ("userid") REFERENCES "User"("userid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "episode" ADD CONSTRAINT "episode_uploaderid_fkey" FOREIGN KEY ("uploaderid") REFERENCES "User"("userid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_podcastid_fkey" FOREIGN KEY ("podcastid") REFERENCES "episode"("episodeid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_userid_fkey" FOREIGN KEY ("userid") REFERENCES "User"("userid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "learning_paths" ADD CONSTRAINT "learning_paths_userid_fkey" FOREIGN KEY ("userid") REFERENCES "User"("userid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "listening_history" ADD CONSTRAINT "listening_history_podcastid_fkey" FOREIGN KEY ("podcastid") REFERENCES "episode"("episodeid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "listening_history" ADD CONSTRAINT "listening_history_userid_fkey" FOREIGN KEY ("userid") REFERENCES "User"("userid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userid_fkey" FOREIGN KEY ("userid") REFERENCES "User"("userid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_podcastid_fkey" FOREIGN KEY ("podcastid") REFERENCES "episode"("episodeid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_podcastid_fkey" FOREIGN KEY ("podcastid") REFERENCES "episode"("episodeid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_userid_fkey" FOREIGN KEY ("userid") REFERENCES "User"("userid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "speech_recognition" ADD CONSTRAINT "speech_recognition_podcastid_fkey" FOREIGN KEY ("podcastid") REFERENCES "episode"("episodeid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "speech_recognition" ADD CONSTRAINT "speech_recognition_userid_fkey" FOREIGN KEY ("userid") REFERENCES "User"("userid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "study_groups" ADD CONSTRAINT "study_groups_creatorid_fkey" FOREIGN KEY ("creatorid") REFERENCES "User"("userid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userid_fkey" FOREIGN KEY ("userid") REFERENCES "User"("userid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subtitles" ADD CONSTRAINT "subtitles_podcastid_fkey" FOREIGN KEY ("podcastid") REFERENCES "episode"("episodeid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_userid_fkey" FOREIGN KEY ("userid") REFERENCES "User"("userid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vocabulary" ADD CONSTRAINT "vocabulary_userid_fkey" FOREIGN KEY ("userid") REFERENCES "User"("userid") ON DELETE CASCADE ON UPDATE NO ACTION;
