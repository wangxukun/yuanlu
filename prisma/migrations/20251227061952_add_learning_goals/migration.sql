-- AlterTable
ALTER TABLE "user_profile" ADD COLUMN     "dailyStudyGoalMins" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "weeklyListeningGoalHours" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "weeklyWordsGoal" INTEGER NOT NULL DEFAULT 50;
