/*
  Warnings:

  - You are about to drop the column `character_id` on the `images` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `images` table. All the data in the column will be lost.
  - You are about to drop the column `gallery_id` on the `images` table. All the data in the column will be lost.
  - You are about to drop the column `visibility` on the `images` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "images" DROP CONSTRAINT "images_character_id_fkey";

-- DropForeignKey
ALTER TABLE "images" DROP CONSTRAINT "images_gallery_id_fkey";

-- AlterTable
ALTER TABLE "images" DROP COLUMN "character_id",
DROP COLUMN "description",
DROP COLUMN "gallery_id",
DROP COLUMN "visibility";
