-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "can_upload_character_images" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "can_upload_own_character_images" BOOLEAN NOT NULL DEFAULT false;
