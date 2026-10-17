-- CreateTable
CREATE TABLE "halloween_guild_settings" (
    "guild_id" VARCHAR(30) NOT NULL,
    "reset_time" INTEGER NOT NULL,
    "knocks_per_day" INTEGER NOT NULL,
    "start_date" TIMESTAMPTZ,
    "end_date" TIMESTAMPTZ,
    "win_rate" DOUBLE PRECISION NOT NULL,
    "win_channel" VARCHAR(30),

    CONSTRAINT "halloween_guild_settings_pkey" PRIMARY KEY ("guild_id")
);

-- CreateTable
CREATE TABLE "halloween_prizes" (
    "guild_id" VARCHAR(30) NOT NULL,
    "id" VARCHAR(30) NOT NULL,
    "name" TEXT NOT NULL,
    "initial_stock" INTEGER NOT NULL,
    "current_stock" INTEGER NOT NULL,
    "weight" INTEGER NOT NULL,
    "image" TEXT NOT NULL,
    "item_type_id" TEXT,
    "character_id" TEXT,

    CONSTRAINT "halloween_prizes_pkey" PRIMARY KEY ("guild_id","id")
);

-- CreateTable
CREATE TABLE "halloween_knock_events" (
    "id" SERIAL NOT NULL,
    "guild_id" VARCHAR(30) NOT NULL,
    "user_id" VARCHAR(30) NOT NULL,
    "prize_id" VARCHAR(30),
    "time" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_pending" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "halloween_knock_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "halloween_gifties" (
    "id" SERIAL NOT NULL,
    "guild_id" VARCHAR(30) NOT NULL,
    "time" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "from_user_id" VARCHAR(30) NOT NULL,
    "to_user_id" VARCHAR(30) NOT NULL,
    "knock_event_id" INTEGER,

    CONSTRAINT "halloween_gifties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "halloween_deviantart_users" (
    "guild_id" VARCHAR(30) NOT NULL,
    "user_id" VARCHAR(30) NOT NULL,
    "deviantart_name" VARCHAR(30) NOT NULL,

    CONSTRAINT "halloween_deviantart_users_pkey" PRIMARY KEY ("user_id","guild_id")
);

-- CreateIndex
CREATE INDEX "halloween_knock_events_guild_id_user_id_time_idx" ON "halloween_knock_events"("guild_id", "user_id", "time");

-- CreateIndex
CREATE INDEX "halloween_gifties_guild_id_to_user_id_idx" ON "halloween_gifties"("guild_id", "to_user_id");

-- CreateIndex
CREATE INDEX "halloween_gifties_guild_id_from_user_id_idx" ON "halloween_gifties"("guild_id", "from_user_id");

-- AddForeignKey
ALTER TABLE "halloween_prizes" ADD CONSTRAINT "halloween_prizes_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "halloween_guild_settings"("guild_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "halloween_knock_events" ADD CONSTRAINT "halloween_knock_events_guild_id_prize_id_fkey" FOREIGN KEY ("guild_id", "prize_id") REFERENCES "halloween_prizes"("guild_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "halloween_gifties" ADD CONSTRAINT "halloween_gifties_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "halloween_guild_settings"("guild_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "halloween_gifties" ADD CONSTRAINT "halloween_gifties_knock_event_id_fkey" FOREIGN KEY ("knock_event_id") REFERENCES "halloween_knock_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "halloween_deviantart_users" ADD CONSTRAINT "halloween_deviantart_users_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "halloween_guild_settings"("guild_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A prize hands over an item or a character, never both.
ALTER TABLE "halloween_prizes" ADD CONSTRAINT "halloween_prizes_chardb_exclusive_check" CHECK ("item_type_id" IS NULL OR "character_id" IS NULL);
