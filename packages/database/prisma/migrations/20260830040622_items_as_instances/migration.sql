-- Items become one row per instance.
--
-- Stacking and provenance cannot both be true: a row whose quantity went
-- 2 -> 4 -> 3 cannot say which two of the three came from a given trade. This
-- migration expands every stacked row into individual items so each one can
-- carry an unbroken history.

-- Expand stacks BEFORE the column is dropped. A row with quantity 3 keeps its
-- own id and gains two siblings, so any id referenced elsewhere stays valid.
--
-- The expanded siblings get no ledger history: they predate the ledger, and
-- inventing GRANT rows for them would put fabricated provenance on a public
-- page. Their history legitimately starts at the next real event.
INSERT INTO "items" (
  "id", "item_type_id", "owner_id", "metadata", "created_at", "updated_at"
)
SELECT
  gen_random_uuid(),
  i."item_type_id",
  i."owner_id",
  i."metadata",
  i."created_at",
  i."updated_at"
FROM "items" i, generate_series(2, i."quantity")
WHERE i."quantity" > 1;

-- The ledger was created by the previous migration in this same change and has
-- never been deployed, so there is no production history to preserve. Clearing
-- it is what lets item_id and batch_id become NOT NULL without a backfill that
-- would invent values.
TRUNCATE TABLE "item_transactions";

-- DropForeignKey
ALTER TABLE "item_transactions" DROP CONSTRAINT "item_transactions_item_id_fkey";

-- AlterTable
ALTER TABLE "item_transactions" DROP COLUMN "quantity_delta",
ADD COLUMN     "batch_id" TEXT NOT NULL,
ALTER COLUMN "item_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "item_types" DROP COLUMN "is_stackable",
DROP COLUMN "max_stack_size";

-- AlterTable
ALTER TABLE "items" DROP COLUMN "quantity",
ADD COLUMN     "destroyed_at" TIMESTAMP(3),
ADD COLUMN     "destroyed_by_id" TEXT;

-- CreateIndex
CREATE INDEX "item_transactions_batch_id_idx" ON "item_transactions"("batch_id");

-- CreateIndex
CREATE INDEX "items_owner_id_destroyed_at_item_type_id_idx" ON "items"("owner_id", "destroyed_at", "item_type_id");

-- CreateIndex
CREATE INDEX "items_item_type_id_destroyed_at_idx" ON "items"("item_type_id", "destroyed_at");

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_destroyed_by_id_fkey" FOREIGN KEY ("destroyed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_transactions" ADD CONSTRAINT "item_transactions_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
