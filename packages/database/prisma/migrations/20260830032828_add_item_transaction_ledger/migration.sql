-- CreateEnum
CREATE TYPE "ItemTransactionKind" AS ENUM ('GRANT', 'REVOKE', 'TRANSFER', 'CLAIM', 'USE');

-- CreateTable
CREATE TABLE "item_transactions" (
    "id" TEXT NOT NULL,
    "community_id" TEXT NOT NULL,
    "item_type_id" TEXT NOT NULL,
    "item_id" TEXT,
    "kind" "ItemTransactionKind" NOT NULL,
    "quantity_delta" INTEGER NOT NULL,
    "from_user_id" TEXT,
    "to_user_id" TEXT,
    "actor_user_id" TEXT,
    "actor_label" VARCHAR(50),
    "reason" TEXT,
    "staff_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "item_transactions_community_id_created_at_idx" ON "item_transactions"("community_id", "created_at");

-- CreateIndex
CREATE INDEX "item_transactions_item_id_created_at_idx" ON "item_transactions"("item_id", "created_at");

-- CreateIndex
CREATE INDEX "item_transactions_item_type_id_created_at_idx" ON "item_transactions"("item_type_id", "created_at");

-- CreateIndex
CREATE INDEX "item_transactions_to_user_id_created_at_idx" ON "item_transactions"("to_user_id", "created_at");

-- CreateIndex
CREATE INDEX "item_transactions_from_user_id_created_at_idx" ON "item_transactions"("from_user_id", "created_at");

-- AddForeignKey
ALTER TABLE "item_transactions" ADD CONSTRAINT "item_transactions_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_transactions" ADD CONSTRAINT "item_transactions_item_type_id_fkey" FOREIGN KEY ("item_type_id") REFERENCES "item_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_transactions" ADD CONSTRAINT "item_transactions_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_transactions" ADD CONSTRAINT "item_transactions_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_transactions" ADD CONSTRAINT "item_transactions_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_transactions" ADD CONSTRAINT "item_transactions_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
