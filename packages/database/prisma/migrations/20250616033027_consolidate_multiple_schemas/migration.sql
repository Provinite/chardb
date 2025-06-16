-- AlterTable
ALTER TABLE "images" ADD COLUMN     "artist_id" TEXT,
ADD COLUMN     "artist_name" VARCHAR(255),
ADD COLUMN     "artist_url" VARCHAR(500),
ADD COLUMN     "source" VARCHAR(500),
ALTER COLUMN "url" SET DATA TYPE TEXT,
ALTER COLUMN "thumbnail_url" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
