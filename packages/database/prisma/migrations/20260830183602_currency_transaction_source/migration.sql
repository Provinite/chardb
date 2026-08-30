-- CreateEnum
CREATE TYPE "CurrencyTransactionSource" AS ENUM ('DIRECT', 'MEDIA_APPROVAL');

-- AlterTable
ALTER TABLE "currency_transactions" ADD COLUMN     "source" "CurrencyTransactionSource" NOT NULL DEFAULT 'DIRECT',
ADD COLUMN     "source_id" TEXT;

-- CreateIndex
CREATE INDEX "currency_transactions_source_source_id_idx" ON "currency_transactions"("source", "source_id");

-- CheckConstraint: the source pair is coherent.
--
-- A DIRECT row carrying a source id claims a cause it cannot name, and a
-- non-DIRECT row without one is a link that goes nowhere -- which is exactly
-- the vagueness these columns exist to remove. Enforced here rather than in
-- the service because both halves are written by every caller that ever mints,
-- and one of them forgetting is the likely failure.
ALTER TABLE "currency_transactions" ADD CONSTRAINT "currency_transactions_source_pair" CHECK (("source" = 'DIRECT') = ("source_id" IS NULL));
