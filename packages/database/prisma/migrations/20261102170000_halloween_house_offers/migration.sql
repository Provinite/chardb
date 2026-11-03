-- House offers: Daphne and Luther put up 3-for-1 candy offers of their own.

ALTER TYPE "halloween_candy_offer_status" ADD VALUE 'EXPIRED';

-- A candy the house made has no knock and no Discord player.
ALTER TABLE "halloween_candies" ALTER COLUMN "knock_event_id" DROP NOT NULL;
ALTER TABLE "halloween_candies" ALTER COLUMN "discord_user_id" DROP NOT NULL;

-- A house offer has a host instead of an owner, and expires.
ALTER TABLE "halloween_candy_offers" ALTER COLUMN "owner_id" DROP NOT NULL;
ALTER TABLE "halloween_candy_offers" ADD COLUMN "host" VARCHAR(20);
ALTER TABLE "halloween_candy_offers" ADD COLUMN "expires_at" TIMESTAMPTZ;

CREATE INDEX "halloween_candy_offers_guild_id_host_created_at_idx" ON "halloween_candy_offers"("guild_id", "host", "created_at");
