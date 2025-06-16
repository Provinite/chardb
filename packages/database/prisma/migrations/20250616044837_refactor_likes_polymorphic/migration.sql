/*
  Warnings:

  - You are about to drop the column `likeable_id` on the `likes` table. All the data in the column will be lost.
  - You are about to drop the column `likeable_type` on the `likes` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[user_id,character_id]` on the table `likes` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,image_id]` on the table `likes` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,gallery_id]` on the table `likes` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,comment_id]` on the table `likes` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "likes" DROP CONSTRAINT "like_character_fkey";

-- DropForeignKey
ALTER TABLE "likes" DROP CONSTRAINT "like_comment_fkey";

-- DropForeignKey
ALTER TABLE "likes" DROP CONSTRAINT "like_gallery_fkey";

-- DropForeignKey
ALTER TABLE "likes" DROP CONSTRAINT "like_image_fkey";

-- DropIndex
DROP INDEX "likes_user_id_likeable_type_likeable_id_key";

-- AlterTable
ALTER TABLE "likes" DROP COLUMN "likeable_id",
DROP COLUMN "likeable_type",
ADD COLUMN     "character_id" TEXT,
ADD COLUMN     "comment_id" TEXT,
ADD COLUMN     "gallery_id" TEXT,
ADD COLUMN     "image_id" TEXT;

-- DropEnum
DROP TYPE "LikeableType";

-- CreateIndex
CREATE UNIQUE INDEX "likes_user_id_character_id_key" ON "likes"("user_id", "character_id");

-- CreateIndex
CREATE UNIQUE INDEX "likes_user_id_image_id_key" ON "likes"("user_id", "image_id");

-- CreateIndex
CREATE UNIQUE INDEX "likes_user_id_gallery_id_key" ON "likes"("user_id", "gallery_id");

-- CreateIndex
CREATE UNIQUE INDEX "likes_user_id_comment_id_key" ON "likes"("user_id", "comment_id");

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
