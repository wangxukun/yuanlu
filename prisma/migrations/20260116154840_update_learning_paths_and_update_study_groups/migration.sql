/*
  Warnings:

  - A unique constraint covering the columns `[inviteCode]` on the table `study_groups` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "learning_paths" ADD COLUMN     "description" TEXT,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "study_groups" ADD COLUMN     "description" TEXT,
ADD COLUMN     "inviteCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "study_groups_inviteCode_key" ON "study_groups"("inviteCode");
