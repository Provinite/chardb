/*
  Warnings:

  - You are about to drop the column `icon_url` on the `item_types` table. All the data in the column will be lost.
  - You are about to drop the column `image_url` on the `item_types` table. All the data in the column will be lost.
  - You are about to drop the column `avatar_url` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "item_types" DROP COLUMN "icon_url",
DROP COLUMN "image_url";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "avatar_url";
