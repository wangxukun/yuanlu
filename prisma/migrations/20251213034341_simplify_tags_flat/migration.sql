/*
  Warnings:

  - You are about to drop the `episode_tags` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `podcast_tags` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tag` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tag_group` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tag_group_tag` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "episode_tags" DROP CONSTRAINT "episode_tags_episodeid_fkey";

-- DropForeignKey
ALTER TABLE "episode_tags" DROP CONSTRAINT "episode_tags_tagid_fkey";

-- DropForeignKey
ALTER TABLE "podcast_tags" DROP CONSTRAINT "podcast_tags_podcastid_fkey";

-- DropForeignKey
ALTER TABLE "podcast_tags" DROP CONSTRAINT "podcast_tags_tagid_fkey";

-- DropForeignKey
ALTER TABLE "tag" DROP CONSTRAINT "tag_tag_groupid_fkey";

-- DropForeignKey
ALTER TABLE "tag_group_tag" DROP CONSTRAINT "tag_group_tag_groupid_fkey";

-- DropForeignKey
ALTER TABLE "tag_group_tag" DROP CONSTRAINT "tag_group_tag_tagid_fkey";

-- DropTable
DROP TABLE "episode_tags";

-- DropTable
DROP TABLE "podcast_tags";

-- DropTable
DROP TABLE "tag";

-- DropTable
DROP TABLE "tag_group";

-- DropTable
DROP TABLE "tag_group_tag";

-- DropEnum
DROP TYPE "tag_type";

-- CreateTable
CREATE TABLE "tags" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_podcastTotag" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_podcastTotag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_episodeTotag" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_episodeTotag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE INDEX "_podcastTotag_B_index" ON "_podcastTotag"("B");

-- CreateIndex
CREATE INDEX "_episodeTotag_B_index" ON "_episodeTotag"("B");

-- AddForeignKey
ALTER TABLE "_podcastTotag" ADD CONSTRAINT "_podcastTotag_A_fkey" FOREIGN KEY ("A") REFERENCES "podcast"("podcastid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_podcastTotag" ADD CONSTRAINT "_podcastTotag_B_fkey" FOREIGN KEY ("B") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_episodeTotag" ADD CONSTRAINT "_episodeTotag_A_fkey" FOREIGN KEY ("A") REFERENCES "episode"("episodeid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_episodeTotag" ADD CONSTRAINT "_episodeTotag_B_fkey" FOREIGN KEY ("B") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
