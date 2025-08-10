/*
  Warnings:

  - You are about to drop the column `main_image_id` on the `characters` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "characters" DROP CONSTRAINT "characters_main_image_id_fkey";

-- AlterTable
ALTER TABLE "characters" DROP COLUMN "main_image_id";
