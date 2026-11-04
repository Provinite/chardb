-- AlterTable
ALTER TABLE "species_variants" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

-- Existing variants keep the order every list showed them in until now:
-- newest first within each species.
UPDATE "species_variants" AS sv
SET "sort_order" = ranked.position
FROM (
  SELECT "id",
         ROW_NUMBER() OVER (
           PARTITION BY "species_id"
           ORDER BY "created_at" DESC, "id"
         ) - 1 AS position
  FROM "species_variants"
) AS ranked
WHERE sv."id" = ranked."id";

-- CreateIndex
CREATE INDEX "species_variants_species_id_sort_order_idx" ON "species_variants"("species_id", "sort_order");
