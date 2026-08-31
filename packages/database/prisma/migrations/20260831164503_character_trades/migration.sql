-- AlterTable
ALTER TABLE "character_ownership_changes" ADD COLUMN     "batch_id" TEXT;

-- CreateTable
CREATE TABLE "trade_characters" (
    "id" TEXT NOT NULL,
    "trade_id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "source_user_id" TEXT NOT NULL,
    "destination_user_id" TEXT NOT NULL,

    CONSTRAINT "trade_characters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trade_characters_character_id_idx" ON "trade_characters"("character_id");

-- CreateIndex
CREATE UNIQUE INDEX "trade_characters_trade_id_character_id_key" ON "trade_characters"("trade_id", "character_id");

-- CreateIndex
CREATE INDEX "character_ownership_changes_batch_id_idx" ON "character_ownership_changes"("batch_id");

-- AddForeignKey
ALTER TABLE "trade_characters" ADD CONSTRAINT "trade_characters_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_characters" ADD CONSTRAINT "trade_characters_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_characters" ADD CONSTRAINT "trade_characters_source_user_id_fkey" FOREIGN KEY ("source_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_characters" ADD CONSTRAINT "trade_characters_destination_user_id_fkey" FOREIGN KEY ("destination_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CheckConstraint: a character line moves someone between two different people.
--
-- Same invariant the item and coin lines carry, for the same reason: a line
-- whose two ends are the same person is a move that never happened.
ALTER TABLE "trade_characters" ADD CONSTRAINT "trade_characters_ends_distinct"
  CHECK ("source_user_id" <> "destination_user_id");
