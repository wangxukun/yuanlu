/*
  Warnings:

  - You are about to drop the column `phone` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `user_profile` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `User` table without a default value. This is not possible if the table is not empty.
  - Made the column `createAt` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updateAt` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `isOnline` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `isCommentAllowed` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "User_phone_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "phone",
ADD COLUMN     "email" VARCHAR(255) NOT NULL,
ADD COLUMN     "emailVerified" TIMESTAMPTZ(6),
ALTER COLUMN "createAt" SET NOT NULL,
ALTER COLUMN "updateAt" SET NOT NULL,
ALTER COLUMN "isOnline" SET NOT NULL,
ALTER COLUMN "isCommentAllowed" SET NOT NULL;

-- AlterTable
ALTER TABLE "user_profile" DROP COLUMN "email";

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
