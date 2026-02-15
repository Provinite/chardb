-- CreateEnum
CREATE TYPE "TraitReviewSource" AS ENUM ('IMPORT', 'MYO', 'USER_EDIT');

-- AlterTable
ALTER TABLE "characters" ADD COLUMN     "trait_review_status" "ModerationStatus";

-- CreateTable
CREATE TABLE "trait_reviews" (
    "id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "status" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "source" "TraitReviewSource" NOT NULL,
    "proposed_trait_values" JSONB NOT NULL,
    "previous_trait_values" JSONB NOT NULL,
    "applied_trait_values" JSONB,
    "resolved_at" TIMESTAMP(3),
    "resolved_by_id" TEXT,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trait_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trait_reviews_character_id_idx" ON "trait_reviews"("character_id");

-- CreateIndex
CREATE INDEX "trait_reviews_status_idx" ON "trait_reviews"("status");

-- AddForeignKey
ALTER TABLE "trait_reviews" ADD CONSTRAINT "trait_reviews_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trait_reviews" ADD CONSTRAINT "trait_reviews_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
