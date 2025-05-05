/*
  Warnings:

  - The values [podcast,episode] on the enum `tag_type` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "tag_type_new" AS ENUM ('PODCAST', 'EPISODE', 'UNIVERSAL');
ALTER TABLE "tag" ALTER COLUMN "type" TYPE "tag_type_new" USING ("type"::text::"tag_type_new");
ALTER TYPE "tag_type" RENAME TO "tag_type_old";
ALTER TYPE "tag_type_new" RENAME TO "tag_type";
DROP TYPE "tag_type_old";
COMMIT;
