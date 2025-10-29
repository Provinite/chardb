/*
  Warnings:

  - You are about to drop the column `color` on the `item_types` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "enum_values" ADD COLUMN     "color_id" TEXT;

-- AlterTable
ALTER TABLE "item_types" DROP COLUMN "color",
ADD COLUMN     "color_id" TEXT;

-- AlterTable
ALTER TABLE "species_variants" ADD COLUMN     "color_id" TEXT;

-- AlterTable
ALTER TABLE "traits" ADD COLUMN     "color_id" TEXT;

-- CreateTable
CREATE TABLE "community_colors" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "hex_code" VARCHAR(7) NOT NULL,
    "community_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_colors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "community_colors_community_id_name_key" ON "community_colors"("community_id", "name");

-- AddForeignKey
ALTER TABLE "community_colors" ADD CONSTRAINT "community_colors_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_types" ADD CONSTRAINT "item_types_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "community_colors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traits" ADD CONSTRAINT "traits_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "community_colors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enum_values" ADD CONSTRAINT "enum_values_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "community_colors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "species_variants" ADD CONSTRAINT "species_variants_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "community_colors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
