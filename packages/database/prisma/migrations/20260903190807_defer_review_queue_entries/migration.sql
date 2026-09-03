-- AlterTable
ALTER TABLE "images" ADD COLUMN     "deferral_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deferral_note" TEXT,
ADD COLUMN     "deferred_at" TIMESTAMP(3),
ADD COLUMN     "deferred_by_id" TEXT;

-- AlterTable
ALTER TABLE "trait_reviews" ADD COLUMN     "deferral_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deferral_note" TEXT,
ADD COLUMN     "deferred_at" TIMESTAMP(3),
ADD COLUMN     "deferred_by_id" TEXT;

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_deferred_by_id_fkey" FOREIGN KEY ("deferred_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trait_reviews" ADD CONSTRAINT "trait_reviews_deferred_by_id_fkey" FOREIGN KEY ("deferred_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
