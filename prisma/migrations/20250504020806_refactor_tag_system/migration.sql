-- AlterTable
ALTER TABLE "tag" ADD COLUMN     "icon" VARCHAR(20),
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tag_groupid" TEXT;

-- CreateTable
CREATE TABLE "tag_group" (
    "groupid" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "sortOrder" INTEGER DEFAULT 0,
    "allowedTypes" "tag_type"[],
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tag_group_pkey" PRIMARY KEY ("groupid")
);

-- CreateTable
CREATE TABLE "tag_group_tag" (
    "tagid" TEXT NOT NULL,
    "groupid" TEXT NOT NULL,
    "sortWeight" INTEGER DEFAULT 0,

    CONSTRAINT "tag_group_tag_pkey" PRIMARY KEY ("tagid","groupid")
);

-- CreateIndex
CREATE UNIQUE INDEX "tag_group_name_key" ON "tag_group"("name");

-- CreateIndex
CREATE INDEX "tag_group_tag_sortWeight_idx" ON "tag_group_tag"("sortWeight");

-- CreateIndex
CREATE INDEX "podcast_tags_tagid_idx" ON "podcast_tags"("tagid");

-- CreateIndex
CREATE INDEX "tag_tag_groupid_idx" ON "tag"("tag_groupid");

-- AddForeignKey
ALTER TABLE "tag" ADD CONSTRAINT "tag_tag_groupid_fkey" FOREIGN KEY ("tag_groupid") REFERENCES "tag_group"("groupid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag_group_tag" ADD CONSTRAINT "tag_group_tag_tagid_fkey" FOREIGN KEY ("tagid") REFERENCES "tag"("tagid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag_group_tag" ADD CONSTRAINT "tag_group_tag_groupid_fkey" FOREIGN KEY ("groupid") REFERENCES "tag_group"("groupid") ON DELETE RESTRICT ON UPDATE CASCADE;
