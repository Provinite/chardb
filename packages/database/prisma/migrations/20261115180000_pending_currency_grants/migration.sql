-- AlterEnum
ALTER TYPE "CurrencyTransactionSource" ADD VALUE 'PENDING_GRANT';

-- AlterTable
ALTER TABLE "pending_ownership" ADD COLUMN     "actor_label" VARCHAR(50),
ADD COLUMN     "actor_user_id" TEXT,
ADD COLUMN     "amount" INTEGER,
ADD COLUMN     "batch_id" TEXT,
ADD COLUMN     "currency_id" TEXT,
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "staff_note" TEXT;

-- CreateIndex
CREATE INDEX "pending_ownership_currency_id_idx" ON "pending_ownership"("currency_id");

-- AddForeignKey
ALTER TABLE "pending_ownership" ADD CONSTRAINT "pending_ownership_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_ownership" ADD CONSTRAINT "pending_ownership_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- A pending row waits on exactly one thing: a character, an item, or a
-- currency grant (#610).
ALTER TABLE "pending_ownership" DROP CONSTRAINT "exactly_one_entity";
ALTER TABLE "pending_ownership" ADD CONSTRAINT "exactly_one_entity"
  CHECK (num_nonnulls("character_id", "item_id", "currency_id") = 1);

-- A currency grant always has a positive amount, a batch and a reason, and
-- nothing else carries them.
ALTER TABLE "pending_ownership" ADD CONSTRAINT "pending_ownership_currency_grant_shape"
  CHECK (
    ("currency_id" IS NULL) = ("amount" IS NULL)
    AND ("currency_id" IS NULL) = ("batch_id" IS NULL)
    AND ("currency_id" IS NULL) = ("reason" IS NULL)
    AND ("currency_id" IS NOT NULL OR (
      "staff_note" IS NULL AND "actor_user_id" IS NULL AND "actor_label" IS NULL
    ))
  );
ALTER TABLE "pending_ownership" ADD CONSTRAINT "pending_ownership_amount_positive"
  CHECK ("amount" IS NULL OR "amount" > 0);
