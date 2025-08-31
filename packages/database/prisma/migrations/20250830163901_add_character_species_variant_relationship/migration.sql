-- AlterTable
ALTER TABLE "characters" ADD COLUMN     "species_variant_id" TEXT;

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_species_variant_id_fkey" FOREIGN KEY ("species_variant_id") REFERENCES "species_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
