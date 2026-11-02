-- How many candies an offer held, kept once the offer closes and its
-- candies move on.
ALTER TABLE "halloween_candy_offers" ADD COLUMN "candy_count" INTEGER;

-- A /knock refused because the player had nothing left to knock with.
CREATE TABLE "halloween_out_of_knocks_attempts" (
    "id" SERIAL NOT NULL,
    "guild_id" VARCHAR(30) NOT NULL,
    "discord_user_id" VARCHAR(30) NOT NULL,
    "time" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "halloween_out_of_knocks_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "halloween_out_of_knocks_attempts_guild_id_discord_user_id_time_idx" ON "halloween_out_of_knocks_attempts"("guild_id", "discord_user_id", "time");
