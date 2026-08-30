-- CreateEnum
CREATE TYPE "TradeStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationKind" ADD VALUE 'TRADE_OFFERED';
ALTER TYPE "NotificationKind" ADD VALUE 'TRADE_ACCEPTED';
ALTER TYPE "NotificationKind" ADD VALUE 'TRADE_DECLINED';

-- AlterEnum
ALTER TYPE "NotificationSubjectType" ADD VALUE 'TRADE';

-- CreateTable
CREATE TABLE "trades" (
    "id" TEXT NOT NULL,
    "community_id" TEXT NOT NULL,
    "proposer_id" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "status" "TradeStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "responded_at" TIMESTAMP(3),
    "settlement_batch_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trade_items" (
    "id" TEXT NOT NULL,
    "trade_id" TEXT NOT NULL,
    "item_id" TEXT,
    "item_type_id" TEXT,
    "quantity" INTEGER,
    "source_user_id" TEXT NOT NULL,
    "destination_user_id" TEXT NOT NULL,

    CONSTRAINT "trade_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trade_currency_lines" (
    "id" TEXT NOT NULL,
    "trade_id" TEXT NOT NULL,
    "currency_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "source_user_id" TEXT NOT NULL,
    "destination_user_id" TEXT NOT NULL,

    CONSTRAINT "trade_currency_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trades_recipient_id_status_created_at_idx" ON "trades"("recipient_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "trades_proposer_id_status_created_at_idx" ON "trades"("proposer_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "trades_community_id_created_at_idx" ON "trades"("community_id", "created_at");

-- CreateIndex
CREATE INDEX "trade_items_item_id_idx" ON "trade_items"("item_id");

-- CreateIndex
CREATE INDEX "trade_items_item_type_id_idx" ON "trade_items"("item_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "trade_items_trade_id_item_id_key" ON "trade_items"("trade_id", "item_id");

-- CreateIndex
CREATE UNIQUE INDEX "trade_currency_lines_trade_id_currency_id_source_user_id_key" ON "trade_currency_lines"("trade_id", "currency_id", "source_user_id");

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_proposer_id_fkey" FOREIGN KEY ("proposer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_items" ADD CONSTRAINT "trade_items_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_items" ADD CONSTRAINT "trade_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_items" ADD CONSTRAINT "trade_items_item_type_id_fkey" FOREIGN KEY ("item_type_id") REFERENCES "item_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_items" ADD CONSTRAINT "trade_items_source_user_id_fkey" FOREIGN KEY ("source_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_items" ADD CONSTRAINT "trade_items_destination_user_id_fkey" FOREIGN KEY ("destination_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_currency_lines" ADD CONSTRAINT "trade_currency_lines_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_currency_lines" ADD CONSTRAINT "trade_currency_lines_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_currency_lines" ADD CONSTRAINT "trade_currency_lines_source_user_id_fkey" FOREIGN KEY ("source_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_currency_lines" ADD CONSTRAINT "trade_currency_lines_destination_user_id_fkey" FOREIGN KEY ("destination_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CheckConstraint: a trade has two distinct parties.
--
-- Trading with yourself is not a smaller trade, it is a no-op that would still
-- write ledger rows on both sides of a move that never happened.
ALTER TABLE "trades" ADD CONSTRAINT "trades_parties_distinct"
  CHECK ("proposer_id" <> "recipient_id");

-- CheckConstraint: a line moves something between two different people.
ALTER TABLE "trade_items" ADD CONSTRAINT "trade_items_ends_distinct"
  CHECK ("source_user_id" <> "destination_user_id");

ALTER TABLE "trade_currency_lines" ADD CONSTRAINT "trade_currency_lines_ends_distinct"
  CHECK ("source_user_id" <> "destination_user_id");

-- CheckConstraint: an item line names a row or a type, never both and never
-- neither.
--
-- These are the two ways to say what is on the table -- "this exact potion" and
-- "any two potions" -- and a row carrying both says two different things about
-- the same line. Unlike "both ends are parties", this invariant lives entirely
-- on one row, so the database can hold it rather than merely being told.
ALTER TABLE "trade_items" ADD CONSTRAINT "trade_items_row_or_type"
  CHECK (
    ("item_id" IS NOT NULL AND "item_type_id" IS NULL AND "quantity" IS NULL)
    OR
    ("item_id" IS NULL AND "item_type_id" IS NOT NULL AND "quantity" IS NOT NULL AND "quantity" > 0)
  );

-- CheckConstraint: coin lines carry a positive amount.
--
-- Direction is the source/destination pair. A negative amount would encode
-- direction a second time, in a way that disagrees with the first.
ALTER TABLE "trade_currency_lines" ADD CONSTRAINT "trade_currency_lines_amount_positive"
  CHECK ("amount" > 0);

-- CheckConstraint: the settlement batch id exists exactly when the trade settled.
ALTER TABLE "trades" ADD CONSTRAINT "trades_settlement_batch_matches_status"
  CHECK (("status" = 'ACCEPTED') = ("settlement_batch_id" IS NOT NULL));

-- CheckConstraint: responded_at is set exactly when the trade is no longer pending.
ALTER TABLE "trades" ADD CONSTRAINT "trades_responded_at_matches_status"
  CHECK (("status" = 'PENDING') = ("responded_at" IS NULL));
