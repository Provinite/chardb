-- Items become one row per instance, and every movement gets a ledger row.
--
-- Stacking and provenance cannot both be true: a row whose quantity went
-- 2 -> 4 -> 3 cannot say which two of the three came from a given trade. This
-- migration expands every stacked row into individual items so each one can
-- carry an unbroken history.
--
-- ORDER MATTERS. The expansion reads items.quantity and pending_ownership, so
-- it runs before the column is dropped; the genesis ledger rows reference
-- item_transactions, so they run after it is created.

-- CreateEnum
CREATE TYPE "ItemTransactionKind" AS ENUM ('GRANT', 'REVOKE', 'TRANSFER', 'CLAIM', 'USE', 'IMPORT');

-- ============================================================================
-- 1. Expand stacks into individual items.
-- ============================================================================
-- A row with quantity 3 keeps its own id and gains two siblings, so any id
-- referenced elsewhere stays valid. The siblings are recorded in a temp table
-- because step 2 needs to know which parent each one came from.
-- Session-scoped, dropped explicitly below rather than ON COMMIT, so this does
-- not depend on the migration runner wrapping the file in a transaction.
CREATE TEMP TABLE _expanded_items AS
SELECT
  gen_random_uuid() AS id,
  i."id"           AS parent_id,
  i."item_type_id",
  i."owner_id",
  i."metadata",
  i."created_at",
  i."updated_at"
FROM "items" i, generate_series(2, i."quantity")
WHERE i."quantity" > 1;

INSERT INTO "items" (
  "id", "item_type_id", "owner_id", "metadata", "created_at", "updated_at"
)
SELECT
  e."id", e."item_type_id", e."owner_id", e."metadata", e."created_at", e."updated_at"
FROM _expanded_items e;

-- ============================================================================
-- 2. Carry pending ownership onto the new siblings.
-- ============================================================================
-- pending_ownership.item_id is UNIQUE -- one record per item, not per stack.
-- Without this, expanding a pending stack of 3 would leave two items with a
-- null owner and no pending record: unowned, unclaimable, and invisible to
-- every query. Silent, permanent loss of someone's prize.
INSERT INTO "pending_ownership" (
  "id", "item_id", "provider", "provider_account_id", "display_identifier",
  "created_at", "claimed_at", "claimed_by_user_id"
)
SELECT
  gen_random_uuid(),
  e."id",
  p."provider",
  p."provider_account_id",
  p."display_identifier",
  p."created_at",
  p."claimed_at",
  p."claimed_by_user_id"
FROM _expanded_items e
JOIN "pending_ownership" p ON p."item_id" = e."parent_id";

DROP TABLE _expanded_items;

-- AlterTable
ALTER TABLE "item_types" DROP COLUMN "is_stackable",
DROP COLUMN "max_stack_size";

-- AlterTable
ALTER TABLE "items" DROP COLUMN "quantity",
ADD COLUMN     "destroyed_at" TIMESTAMP(3),
ADD COLUMN     "destroyed_by_id" TEXT;

-- CreateTable
CREATE TABLE "item_transactions" (
    "id" TEXT NOT NULL,
    "community_id" TEXT NOT NULL,
    "item_type_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "kind" "ItemTransactionKind" NOT NULL,
    "batch_id" TEXT NOT NULL,
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

-- CreateIndex
CREATE INDEX "item_transactions_batch_id_idx" ON "item_transactions"("batch_id");

-- CreateIndex
CREATE INDEX "items_owner_id_destroyed_at_item_type_id_idx" ON "items"("owner_id", "destroyed_at", "item_type_id");

-- CreateIndex
CREATE INDEX "items_item_type_id_destroyed_at_idx" ON "items"("item_type_id", "destroyed_at");

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_destroyed_by_id_fkey" FOREIGN KEY ("destroyed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_transactions" ADD CONSTRAINT "item_transactions_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_transactions" ADD CONSTRAINT "item_transactions_item_type_id_fkey" FOREIGN KEY ("item_type_id") REFERENCES "item_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_transactions" ADD CONSTRAINT "item_transactions_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_transactions" ADD CONSTRAINT "item_transactions_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_transactions" ADD CONSTRAINT "item_transactions_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_transactions" ADD CONSTRAINT "item_transactions_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- 3. Give every pre-existing item a genesis ledger row.
-- ============================================================================
-- One IMPORT row per item, all sharing one batch id.
--
-- Not a GRANT: nobody granted these, and inventing one would put fabricated
-- provenance on a page members can read. IMPORT says exactly what is true --
-- the item predates the ledger and its real origin was never recorded.
--
-- The alternative was leaving these items with an empty provenance timeline,
-- which reads to a member as a broken page rather than as missing history.
INSERT INTO "item_transactions" (
  "id", "community_id", "item_type_id", "item_id", "kind", "batch_id",
  "from_user_id", "to_user_id", "actor_user_id", "actor_label",
  "reason", "staff_note", "created_at"
)
SELECT
  gen_random_uuid(),
  t."community_id",
  i."item_type_id",
  i."id",
  'IMPORT',
  -- One batch for the whole migration, so the ledger shows it as a single
  -- event rather than one line per item.
  '00000000-0000-0000-0000-000000000000',
  NULL,
  i."owner_id",
  NULL,
  'system',
  'Recorded when the item ledger was introduced. Earlier history was not tracked.',
  NULL,
  i."created_at"
FROM "items" i
JOIN "item_types" t ON t."id" = i."item_type_id";
