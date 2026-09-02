-- CreateTable
CREATE TABLE "character_variant_changes" (
    "id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "from_variant_id" TEXT,
    "to_variant_id" TEXT,
    "changed_by_id" TEXT,
    "reason" TEXT,
    "previous_trait_values" JSONB NOT NULL,
    "new_trait_values" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "character_variant_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "character_variant_changes_character_id_created_at_idx" ON "character_variant_changes"("character_id", "created_at");

-- AddForeignKey
ALTER TABLE "character_variant_changes" ADD CONSTRAINT "character_variant_changes_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_variant_changes" ADD CONSTRAINT "character_variant_changes_from_variant_id_fkey" FOREIGN KEY ("from_variant_id") REFERENCES "species_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_variant_changes" ADD CONSTRAINT "character_variant_changes_to_variant_id_fkey" FOREIGN KEY ("to_variant_id") REFERENCES "species_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_variant_changes" ADD CONSTRAINT "character_variant_changes_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
