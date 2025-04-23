-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'users';

-- AlterTable
ALTER TABLE "user_profile" ADD COLUMN     "avatarFileName" VARCHAR(255);
