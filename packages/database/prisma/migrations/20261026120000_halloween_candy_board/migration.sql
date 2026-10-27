-- Halloween candy board: the candy each lost knock showed, and where each
-- player has stuck theirs. Losses from before this have no candy.

-- AlterTable
ALTER TABLE "halloween_knock_events" ADD COLUMN     "candy_slug" VARCHAR(40);

-- CreateTable
CREATE TABLE "halloween_candy_boards" (
    "id" UUID NOT NULL,
    "guild_id" VARCHAR(30) NOT NULL,
    "user_id" VARCHAR(30) NOT NULL,
    "placements" JSONB NOT NULL DEFAULT '[]',
    "background" VARCHAR(60),
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "halloween_candy_boards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "halloween_candy_boards_guild_id_user_id_key" ON "halloween_candy_boards"("guild_id", "user_id");
