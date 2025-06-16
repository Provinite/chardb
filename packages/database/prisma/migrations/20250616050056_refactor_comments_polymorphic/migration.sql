/*
  Warnings:

  - You are about to drop the column `commentable_id` on the `comments` table. All the data in the column will be lost.
  - You are about to drop the column `commentable_type` on the `comments` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "comments" DROP CONSTRAINT "comment_character_fkey";

-- DropForeignKey
ALTER TABLE "comments" DROP CONSTRAINT "comment_gallery_fkey";

-- DropForeignKey
ALTER TABLE "comments" DROP CONSTRAINT "comment_image_fkey";

-- AlterTable
ALTER TABLE "comments" DROP COLUMN "commentable_id",
DROP COLUMN "commentable_type",
ADD COLUMN     "character_id" TEXT,
ADD COLUMN     "gallery_id" TEXT,
ADD COLUMN     "image_id" TEXT,
ADD COLUMN     "user_id" TEXT;

-- DropEnum
DROP TYPE "CommentableType";

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
