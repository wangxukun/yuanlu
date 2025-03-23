/*
  Warnings:

  - You are about to drop the column `name` on the `category` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[title]` on the table `category` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `title` to the `category` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "category_name_key";

-- AlterTable
ALTER TABLE "category" DROP COLUMN "name",
ADD COLUMN     "coverFileName" VARCHAR(255),
ADD COLUMN     "title" VARCHAR(255) NOT NULL;

-- AlterTable
ALTER TABLE "episode" ADD COLUMN     "audioFileName" VARCHAR(255),
ADD COLUMN     "coverFileName" VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "category_title_key" ON "category"("title");
