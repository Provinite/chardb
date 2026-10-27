-- Halloween candy board: the candy each lost knock showed, and where each
-- player has stuck theirs. Losses from before this have no candy.

-- AlterTable
ALTER TABLE "halloween_knock_events" ADD COLUMN     "candy_slug" VARCHAR(40);

-- CreateTable
CREATE TABLE "halloween_candy_boards" (
    "guild_id" VARCHAR(30) NOT NULL,
    "user_id" VARCHAR(30) NOT NULL,
    "placements" JSONB NOT NULL DEFAULT '[]',
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "halloween_candy_boards_pkey" PRIMARY KEY ("guild_id","user_id")
);

