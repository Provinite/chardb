-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ItemTransactionSource" ADD VALUE 'TRAIT_EDIT_REDEMPTION';
ALTER TYPE "ItemTransactionSource" ADD VALUE 'TRAIT_EDIT_REJECTION';

-- CreateTable
CREATE TABLE "item_use_trait_edit_grants" (
    "id" TEXT NOT NULL,
    "item_type_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_use_trait_edit_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_use_trait_edit_grant_species" (
    "id" TEXT NOT NULL,
    "grant_id" TEXT NOT NULL,
    "species_id" TEXT NOT NULL,

    CONSTRAINT "item_use_trait_edit_grant_species_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_use_trait_edit_grant_variants" (
    "id" TEXT NOT NULL,
    "grant_species_id" TEXT NOT NULL,
    "species_variant_id" TEXT NOT NULL,

    CONSTRAINT "item_use_trait_edit_grant_variants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "item_use_trait_edit_grants_item_type_id_key" ON "item_use_trait_edit_grants"("item_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "item_use_trait_edit_grant_species_grant_id_species_id_key" ON "item_use_trait_edit_grant_species"("grant_id", "species_id");

-- CreateIndex
CREATE UNIQUE INDEX "item_use_trait_edit_grant_variants_grant_species_id_species_key" ON "item_use_trait_edit_grant_variants"("grant_species_id", "species_variant_id");

-- AddForeignKey
ALTER TABLE "item_use_trait_edit_grants" ADD CONSTRAINT "item_use_trait_edit_grants_item_type_id_fkey" FOREIGN KEY ("item_type_id") REFERENCES "item_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_use_trait_edit_grant_species" ADD CONSTRAINT "item_use_trait_edit_grant_species_grant_id_fkey" FOREIGN KEY ("grant_id") REFERENCES "item_use_trait_edit_grants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_use_trait_edit_grant_species" ADD CONSTRAINT "item_use_trait_edit_grant_species_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "species"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_use_trait_edit_grant_variants" ADD CONSTRAINT "item_use_trait_edit_grant_variants_grant_species_id_fkey" FOREIGN KEY ("grant_species_id") REFERENCES "item_use_trait_edit_grant_species"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_use_trait_edit_grant_variants" ADD CONSTRAINT "item_use_trait_edit_grant_variants_species_variant_id_fkey" FOREIGN KEY ("species_variant_id") REFERENCES "species_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
