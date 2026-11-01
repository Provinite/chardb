-- The knocker's Discord handle and display name as the knock saw them, for
-- staff reading the win feed. Null on knocks from before they were recorded.
ALTER TABLE "halloween_knock_events" ADD COLUMN "discord_username" VARCHAR(32);
ALTER TABLE "halloween_knock_events" ADD COLUMN "discord_display_name" VARCHAR(32);
