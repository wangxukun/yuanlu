-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isCommentAllowed" BOOLEAN DEFAULT true,
ALTER COLUMN "role" SET DEFAULT 'USER';

-- AlterTable
ALTER TABLE "episode" ADD COLUMN     "isCommentEnabled" BOOLEAN DEFAULT true;
