/*
  Warnings:

  - You are about to drop the `UserDailyActivity` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "UserDailyActivity" DROP CONSTRAINT "UserDailyActivity_userid_fkey";

-- DropTable
DROP TABLE "UserDailyActivity";

-- CreateTable
CREATE TABLE "user_daily_activity" (
    "id" TEXT NOT NULL,
    "userid" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "listeningSeconds" INTEGER NOT NULL DEFAULT 0,
    "wordsLearned" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_daily_activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_daily_activity_userid_date_idx" ON "user_daily_activity"("userid", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "user_daily_activity_userid_date_key" ON "user_daily_activity"("userid", "date");

-- AddForeignKey
ALTER TABLE "user_daily_activity" ADD CONSTRAINT "user_daily_activity_userid_fkey" FOREIGN KEY ("userid") REFERENCES "User"("userid") ON DELETE CASCADE ON UPDATE NO ACTION;
