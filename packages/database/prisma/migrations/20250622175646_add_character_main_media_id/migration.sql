-- AlterTable
ALTER TABLE "characters" ADD COLUMN     "main_media_id" TEXT;

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_main_media_id_fkey" FOREIGN KEY ("main_media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
