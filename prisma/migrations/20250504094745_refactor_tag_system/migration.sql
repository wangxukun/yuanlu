/*
  Warnings:

  - You are about to drop the column `icon` on the `tag` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `tag_group` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "tag" DROP COLUMN "icon",
ADD COLUMN     "coverFileName" VARCHAR(255),
ADD COLUMN     "coverUrl" VARCHAR(255) NOT NULL DEFAULT 'default_tag_cover_url';

-- AlterTable
ALTER TABLE "tag_group" DROP COLUMN "imageUrl",
ADD COLUMN     "coverFileName" VARCHAR(255),
ADD COLUMN     "coverUrl" VARCHAR(255) NOT NULL DEFAULT 'default_tag_group_cover_url';
