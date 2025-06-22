-- AlterTable
ALTER TABLE "characters" ADD COLUMN     "main_image_id" TEXT;

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_main_image_id_fkey" FOREIGN KEY ("main_image_id") REFERENCES "images"("id") ON DELETE SET NULL ON UPDATE CASCADE;
