-- An offer may take any kind of candy, shown by no wanted kind.
ALTER TABLE "halloween_candy_offers" ALTER COLUMN "want_slug" DROP NOT NULL;
