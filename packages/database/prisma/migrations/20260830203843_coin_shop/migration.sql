-- CreateEnum
CREATE TYPE "ItemTransactionSource" AS ENUM ('DIRECT', 'SHOP_PURCHASE');

-- AlterEnum
ALTER TYPE "CurrencyTransactionSource" ADD VALUE 'SHOP_PURCHASE';

-- AlterTable
ALTER TABLE "item_transactions" ADD COLUMN     "source" "ItemTransactionSource" NOT NULL DEFAULT 'DIRECT',
ADD COLUMN     "source_id" TEXT;

-- CreateTable
CREATE TABLE "shop_items" (
    "id" TEXT NOT NULL,
    "community_id" TEXT NOT NULL,
    "item_type_id" TEXT NOT NULL,
    "name" VARCHAR(100),
    "description" TEXT,
    "stock" INTEGER,
    "max_per_user" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_prices" (
    "id" TEXT NOT NULL,
    "shop_item_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_price_components" (
    "id" TEXT NOT NULL,
    "shop_price_id" TEXT NOT NULL,
    "currency_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "shop_price_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_purchases" (
    "id" TEXT NOT NULL,
    "community_id" TEXT NOT NULL,
    "buyer_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_purchase_lines" (
    "id" TEXT NOT NULL,
    "purchase_id" TEXT NOT NULL,
    "shop_item_id" TEXT NOT NULL,
    "shop_price_id" TEXT,
    "refunded_at" TIMESTAMP(3),
    "refunded_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_purchase_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_purchase_line_costs" (
    "id" TEXT NOT NULL,
    "line_id" TEXT NOT NULL,
    "currency_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "shop_purchase_line_costs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shop_items_community_id_active_sort_order_idx" ON "shop_items"("community_id", "active", "sort_order");

-- CreateIndex
CREATE INDEX "shop_prices_shop_item_id_sort_order_idx" ON "shop_prices"("shop_item_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "shop_price_components_shop_price_id_currency_id_key" ON "shop_price_components"("shop_price_id", "currency_id");

-- CreateIndex
CREATE INDEX "shop_purchases_community_id_created_at_idx" ON "shop_purchases"("community_id", "created_at");

-- CreateIndex
CREATE INDEX "shop_purchases_buyer_id_created_at_idx" ON "shop_purchases"("buyer_id", "created_at");

-- CreateIndex
CREATE INDEX "shop_purchase_lines_purchase_id_idx" ON "shop_purchase_lines"("purchase_id");

-- CreateIndex
CREATE INDEX "shop_purchase_lines_shop_item_id_idx" ON "shop_purchase_lines"("shop_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "shop_purchase_line_costs_line_id_currency_id_key" ON "shop_purchase_line_costs"("line_id", "currency_id");

-- CreateIndex
CREATE INDEX "item_transactions_source_source_id_idx" ON "item_transactions"("source", "source_id");

-- AddForeignKey
ALTER TABLE "shop_items" ADD CONSTRAINT "shop_items_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_items" ADD CONSTRAINT "shop_items_item_type_id_fkey" FOREIGN KEY ("item_type_id") REFERENCES "item_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_prices" ADD CONSTRAINT "shop_prices_shop_item_id_fkey" FOREIGN KEY ("shop_item_id") REFERENCES "shop_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_price_components" ADD CONSTRAINT "shop_price_components_shop_price_id_fkey" FOREIGN KEY ("shop_price_id") REFERENCES "shop_prices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_price_components" ADD CONSTRAINT "shop_price_components_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_purchases" ADD CONSTRAINT "shop_purchases_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_purchases" ADD CONSTRAINT "shop_purchases_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_purchase_lines" ADD CONSTRAINT "shop_purchase_lines_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "shop_purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_purchase_lines" ADD CONSTRAINT "shop_purchase_lines_shop_item_id_fkey" FOREIGN KEY ("shop_item_id") REFERENCES "shop_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_purchase_lines" ADD CONSTRAINT "shop_purchase_lines_shop_price_id_fkey" FOREIGN KEY ("shop_price_id") REFERENCES "shop_prices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_purchase_lines" ADD CONSTRAINT "shop_purchase_lines_refunded_by_id_fkey" FOREIGN KEY ("refunded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_purchase_line_costs" ADD CONSTRAINT "shop_purchase_line_costs_line_id_fkey" FOREIGN KEY ("line_id") REFERENCES "shop_purchase_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_purchase_line_costs" ADD CONSTRAINT "shop_purchase_line_costs_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CheckConstraint: stock can never go negative.
--
-- The same reasoning as the non-negative currency balance, and the same
-- failure without it: "read the stock, compare, then decrement" races two
-- concurrent checkouts against the last unit and sells it twice. The
-- constraint is evaluated by the statement that does the decrement, so the
-- loser gets an error instead of an oversell. Unlimited stock is NULL, which
-- this leaves alone.
ALTER TABLE "shop_items" ADD CONSTRAINT "shop_items_stock_non_negative" CHECK ("stock" IS NULL OR "stock" >= 0);

-- CheckConstraint: a limit of zero is not a limit, it is a mistake.
ALTER TABLE "shop_items" ADD CONSTRAINT "shop_items_max_per_user_positive" CHECK ("max_per_user" IS NULL OR "max_per_user" > 0);

-- CheckConstraint: a price component must ask for something.
--
-- A zero-amount component makes an option look like it costs a currency it
-- does not, and a negative one would pay the buyer to take the item.
ALTER TABLE "shop_price_components" ADD CONSTRAINT "shop_price_components_amount_positive" CHECK ("amount" > 0);

-- CheckConstraint: what was paid is what gets refunded, so it must be real.
ALTER TABLE "shop_purchase_line_costs" ADD CONSTRAINT "shop_purchase_line_costs_amount_positive" CHECK ("amount" > 0);

-- CheckConstraint: a refunded line names who refunded it.
--
-- The two halves are written together or not at all. A line marked refunded
-- with nobody attached is an item and some currency moving with no account of
-- who moved them.
ALTER TABLE "shop_purchase_lines" ADD CONSTRAINT "shop_purchase_lines_refund_pair" CHECK (("refunded_at" IS NULL) = ("refunded_by_id" IS NULL));

-- CheckConstraint: the item ledger's source pair is coherent, exactly as the
-- currency ledger's already is.
ALTER TABLE "item_transactions" ADD CONSTRAINT "item_transactions_source_pair" CHECK (("source" = 'DIRECT') = ("source_id" IS NULL));
