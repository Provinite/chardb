-- A win of a prize staff hand over themselves gets its own row: the winner
-- as Discord showed them, and whether it has been handed over.
CREATE TABLE "halloween_staff_awards" (
    "knock_event_id" INTEGER NOT NULL,
    "guild_id" VARCHAR(30) NOT NULL,
    "discord_user_id" VARCHAR(30) NOT NULL,
    "discord_username" VARCHAR(32),
    "discord_display_name" VARCHAR(32),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivered_at" TIMESTAMPTZ,
    "delivered_by_id" TEXT,

    CONSTRAINT "halloween_staff_awards_pkey" PRIMARY KEY ("knock_event_id")
);

CREATE INDEX "halloween_staff_awards_guild_id_delivered_at_idx" ON "halloween_staff_awards"("guild_id", "delivered_at");

ALTER TABLE "halloween_staff_awards" ADD CONSTRAINT "halloween_staff_awards_knock_event_id_fkey" FOREIGN KEY ("knock_event_id") REFERENCES "halloween_knock_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "halloween_staff_awards" ADD CONSTRAINT "halloween_staff_awards_delivered_by_id_fkey" FOREIGN KEY ("delivered_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Every staff prize won so far, still waiting or already handed over. Their
-- winners' names were never recorded.
INSERT INTO "halloween_staff_awards"
    ("knock_event_id", "guild_id", "discord_user_id", "created_at", "delivered_at", "delivered_by_id")
SELECT k."id", k."guild_id", k."user_id", k."time", k."delivered_at", k."delivered_by_id"
FROM "halloween_knock_events" k
JOIN "halloween_prizes" p ON p."guild_id" = k."guild_id" AND p."id" = k."prize_id"
WHERE NOT k."is_pending"
  AND p."item_type_id" IS NULL
  AND p."character_id" IS NULL;

-- halloween_knock_events.delivered_at and delivered_by_id stay for now, unused:
-- the release still running while this one rolls out reads them. A later
-- migration drops them.
