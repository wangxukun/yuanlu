-- AlterTable
ALTER TABLE "comments" ADD COLUMN     "parentId" INTEGER;

-- CreateTable
CREATE TABLE "comment_likes" (
    "likeid" SERIAL NOT NULL,
    "userid" TEXT NOT NULL,
    "commentid" INTEGER NOT NULL,
    "likedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_likes_pkey" PRIMARY KEY ("likeid")
);

-- CreateIndex
CREATE UNIQUE INDEX "comment_likes_userid_commentid_key" ON "comment_likes"("userid", "commentid");

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "comments"("commentid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_userid_fkey" FOREIGN KEY ("userid") REFERENCES "User"("userid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_commentid_fkey" FOREIGN KEY ("commentid") REFERENCES "comments"("commentid") ON DELETE CASCADE ON UPDATE CASCADE;
