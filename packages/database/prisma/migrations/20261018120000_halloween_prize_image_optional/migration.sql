-- A chardb prize shows its item type's or character's image, so stores none.
ALTER TABLE "halloween_prizes" ALTER COLUMN "image" DROP NOT NULL;
