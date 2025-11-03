-- AlterTable
ALTER TABLE "characters" ALTER COLUMN "owner_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "items" ALTER COLUMN "owner_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "can_create_orphaned_character" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "pending_ownership" (
    "id" TEXT NOT NULL,
    "character_id" TEXT,
    "item_id" TEXT,
    "provider" "ExternalAccountProvider" NOT NULL,
    "provider_account_id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimed_at" TIMESTAMP(3),
    "claimed_by_user_id" TEXT,

    CONSTRAINT "pending_ownership_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "exactly_one_entity" CHECK (
        (character_id IS NOT NULL AND item_id IS NULL) OR
        (character_id IS NULL AND item_id IS NOT NULL)
    )
);

-- CreateIndex
CREATE UNIQUE INDEX "pending_ownership_character_id_key" ON "pending_ownership"("character_id");

-- CreateIndex
CREATE UNIQUE INDEX "pending_ownership_item_id_key" ON "pending_ownership"("item_id");

-- CreateIndex
CREATE INDEX "pending_ownership_provider_provider_account_id_idx" ON "pending_ownership"("provider", "provider_account_id");

-- AddForeignKey
ALTER TABLE "pending_ownership" ADD CONSTRAINT "pending_ownership_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_ownership" ADD CONSTRAINT "pending_ownership_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_ownership" ADD CONSTRAINT "pending_ownership_claimed_by_user_id_fkey" FOREIGN KEY ("claimed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
