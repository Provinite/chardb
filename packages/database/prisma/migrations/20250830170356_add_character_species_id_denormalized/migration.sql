-- AlterTable
ALTER TABLE "characters" ADD COLUMN     "species_id" TEXT;

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "species"("id") ON DELETE SET NULL ON UPDATE CASCADE;
