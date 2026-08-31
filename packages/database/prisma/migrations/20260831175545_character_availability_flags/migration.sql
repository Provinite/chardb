-- AlterTable
ALTER TABLE "characters" ADD COLUMN     "is_freebie" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_open_to_offers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_sellable_for_coin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_tradeable_for_art" BOOLEAN NOT NULL DEFAULT false;
