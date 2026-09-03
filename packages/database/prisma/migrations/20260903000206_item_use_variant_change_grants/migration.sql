-- AlterEnum
ALTER TYPE "ItemTransactionSource" ADD VALUE 'VARIANT_CHANGE_REDEMPTION';

-- CreateTable
CREATE TABLE "item_use_variant_change_grants" (
    "id" TEXT NOT NULL,
    "item_type_id" TEXT NOT NULL,
    "species_id" TEXT NOT NULL,
    "to_variant_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_use_variant_change_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_use_variant_change_grant_from_variants" (
    "id" TEXT NOT NULL,
    "grant_id" TEXT NOT NULL,
    "species_variant_id" TEXT NOT NULL,

    CONSTRAINT "item_use_variant_change_grant_from_variants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "item_use_variant_change_grants_item_type_id_key" ON "item_use_variant_change_grants"("item_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "item_use_variant_change_grant_from_variants_grant_id_specie_key" ON "item_use_variant_change_grant_from_variants"("grant_id", "species_variant_id");

-- AddForeignKey
ALTER TABLE "item_use_variant_change_grants" ADD CONSTRAINT "item_use_variant_change_grants_item_type_id_fkey" FOREIGN KEY ("item_type_id") REFERENCES "item_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_use_variant_change_grants" ADD CONSTRAINT "item_use_variant_change_grants_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "species"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_use_variant_change_grants" ADD CONSTRAINT "item_use_variant_change_grants_to_variant_id_fkey" FOREIGN KEY ("to_variant_id") REFERENCES "species_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_use_variant_change_grant_from_variants" ADD CONSTRAINT "item_use_variant_change_grant_from_variants_grant_id_fkey" FOREIGN KEY ("grant_id") REFERENCES "item_use_variant_change_grants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_use_variant_change_grant_from_variants" ADD CONSTRAINT "item_use_variant_change_grant_from_variants_species_varian_fkey" FOREIGN KEY ("species_variant_id") REFERENCES "species_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
