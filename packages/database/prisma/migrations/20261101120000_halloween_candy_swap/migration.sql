-- CreateEnum
CREATE TYPE "halloween_candy_offer_status" AS ENUM ('OPEN', 'FILLED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'HALLOWEEN_CANDY_TRADED';

-- AlterEnum
ALTER TYPE "NotificationSubjectType" ADD VALUE 'HALLOWEEN_CANDY_TRADE';

-- Boards move from a Discord player to a chardb user, and their placements
-- from knock ids to candy ids. Existing boards are wiped rather than carried.
DELETE FROM "halloween_candy_boards";

-- DropIndex
DROP INDEX "halloween_candy_boards_guild_id_user_id_idx";

-- AlterTable
ALTER TABLE "halloween_candy_boards" DROP COLUMN "user_id",
ADD COLUMN     "owner_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "halloween_candies" (
    "id" SERIAL NOT NULL,
    "guild_id" VARCHAR(30) NOT NULL,
    "slug" VARCHAR(40) NOT NULL,
    "knock_event_id" INTEGER NOT NULL,
    "discord_user_id" VARCHAR(30) NOT NULL,
    "owner_id" TEXT,
    "claimed_at" TIMESTAMPTZ,
    "offer_id" UUID,
    "received_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "halloween_candies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "halloween_candy_offers" (
    "id" UUID NOT NULL,
    "guild_id" VARCHAR(30) NOT NULL,
    "owner_id" TEXT NOT NULL,
    "want_slug" VARCHAR(40) NOT NULL,
    "status" "halloween_candy_offer_status" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ,
    "trade_id" UUID,

    CONSTRAINT "halloween_candy_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "halloween_candy_trades" (
    "id" UUID NOT NULL,
    "guild_id" VARCHAR(30) NOT NULL,
    "initiator_id" TEXT,
    "offerer_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "halloween_candy_trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "halloween_candy_trade_lines" (
    "id" SERIAL NOT NULL,
    "trade_id" UUID NOT NULL,
    "candy_id" INTEGER NOT NULL,
    "slug" VARCHAR(40) NOT NULL,
    "to_initiator" BOOLEAN NOT NULL,

    CONSTRAINT "halloween_candy_trade_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "halloween_candies_knock_event_id_key" ON "halloween_candies"("knock_event_id");

-- CreateIndex
CREATE INDEX "halloween_candies_guild_id_owner_id_idx" ON "halloween_candies"("guild_id", "owner_id");

-- CreateIndex
CREATE INDEX "halloween_candies_guild_id_discord_user_id_idx" ON "halloween_candies"("guild_id", "discord_user_id");

-- CreateIndex
CREATE INDEX "halloween_candies_offer_id_idx" ON "halloween_candies"("offer_id");

-- CreateIndex
CREATE INDEX "halloween_candy_offers_guild_id_status_want_slug_idx" ON "halloween_candy_offers"("guild_id", "status", "want_slug");

-- CreateIndex
CREATE INDEX "halloween_candy_offers_owner_id_status_idx" ON "halloween_candy_offers"("owner_id", "status");

-- CreateIndex
CREATE INDEX "halloween_candy_trades_guild_id_initiator_id_created_at_idx" ON "halloween_candy_trades"("guild_id", "initiator_id", "created_at");

-- CreateIndex
CREATE INDEX "halloween_candy_trades_guild_id_offerer_id_created_at_idx" ON "halloween_candy_trades"("guild_id", "offerer_id", "created_at");

-- CreateIndex
CREATE INDEX "halloween_candy_trade_lines_trade_id_idx" ON "halloween_candy_trade_lines"("trade_id");

-- CreateIndex
CREATE INDEX "halloween_candy_boards_guild_id_owner_id_idx" ON "halloween_candy_boards"("guild_id", "owner_id");

-- AddForeignKey
ALTER TABLE "halloween_candies" ADD CONSTRAINT "halloween_candies_knock_event_id_fkey" FOREIGN KEY ("knock_event_id") REFERENCES "halloween_knock_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "halloween_candies" ADD CONSTRAINT "halloween_candies_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "halloween_candies" ADD CONSTRAINT "halloween_candies_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "halloween_candy_offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "halloween_candy_offers" ADD CONSTRAINT "halloween_candy_offers_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "halloween_candy_offers" ADD CONSTRAINT "halloween_candy_offers_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "halloween_candy_trades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "halloween_candy_trades" ADD CONSTRAINT "halloween_candy_trades_initiator_id_fkey" FOREIGN KEY ("initiator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "halloween_candy_trades" ADD CONSTRAINT "halloween_candy_trades_offerer_id_fkey" FOREIGN KEY ("offerer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "halloween_candy_trade_lines" ADD CONSTRAINT "halloween_candy_trade_lines_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "halloween_candy_trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "halloween_candy_trade_lines" ADD CONSTRAINT "halloween_candy_trade_lines_candy_id_fkey" FOREIGN KEY ("candy_id") REFERENCES "halloween_candies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "halloween_candy_boards" ADD CONSTRAINT "halloween_candy_boards_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

