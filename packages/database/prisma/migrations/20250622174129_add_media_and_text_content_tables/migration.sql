/*
  Warnings:

  - A unique constraint covering the columns `[user_id,media_id]` on the table `likes` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'TEXT');

-- CreateEnum
CREATE TYPE "TextFormatting" AS ENUM ('PLAINTEXT', 'MARKDOWN');

-- AlterTable
ALTER TABLE "comments" ADD COLUMN     "media_id" TEXT;

-- AlterTable
ALTER TABLE "likes" ADD COLUMN     "media_id" TEXT;

-- CreateTable
CREATE TABLE "media" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "owner_id" TEXT NOT NULL,
    "character_id" TEXT,
    "gallery_id" TEXT,
    "visibility" "Visibility" NOT NULL DEFAULT 'PUBLIC',
    "media_type" "MediaType" NOT NULL,
    "content_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "text_content" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "word_count" INTEGER NOT NULL,
    "formatting" "TextFormatting" NOT NULL DEFAULT 'PLAINTEXT',

    CONSTRAINT "text_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_tags" (
    "media_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "media_tags_pkey" PRIMARY KEY ("media_id","tag_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "likes_user_id_media_id_key" ON "likes"("user_id", "media_id");

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "galleries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_tags" ADD CONSTRAINT "media_tags_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_tags" ADD CONSTRAINT "media_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
