-- AlterEnum
ALTER TYPE "CurrencyTransactionSource" ADD VALUE 'ITEM_USE';

-- CreateTable
CREATE TABLE "item_use_payouts" (
    "id" TEXT NOT NULL,
    "item_type_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_use_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_use_payout_components" (
    "id" TEXT NOT NULL,
    "payout_id" TEXT NOT NULL,
    "currency_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "item_use_payout_components_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "item_use_payouts_item_type_id_key" ON "item_use_payouts"("item_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "item_use_payout_components_payout_id_currency_id_key" ON "item_use_payout_components"("payout_id", "currency_id");

-- AddForeignKey
ALTER TABLE "item_use_payouts" ADD CONSTRAINT "item_use_payouts_item_type_id_fkey" FOREIGN KEY ("item_type_id") REFERENCES "item_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_use_payout_components" ADD CONSTRAINT "item_use_payout_components_payout_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "item_use_payouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_use_payout_components" ADD CONSTRAINT "item_use_payout_components_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
