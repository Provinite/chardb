/*
  Warnings:

  - You are about to drop the column `backstory` on the `characters` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `characters` table. All the data in the column will be lost.
  - You are about to drop the column `personality` on the `characters` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "characters" DROP COLUMN "backstory",
DROP COLUMN "description",
DROP COLUMN "personality";
