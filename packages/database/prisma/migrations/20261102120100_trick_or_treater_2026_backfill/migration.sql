-- Trick-or-Treater 2026 is earned by signing in during the event, but the
-- event was already running when that started counting and no sign-in was
-- ever recorded. Members who used the candy swap or a candy board during the
-- event were signed in to do it, so they earn it here, dated by their first
-- such use.
INSERT INTO "user_achievements" ("id", "user_id", "community_id", "slug", "earned_at")
SELECT gen_random_uuid()::text, activity.user_id, c.id, 'trick-or-treater-2026', MIN(activity.at)
FROM "communities" c
JOIN "halloween_guild_settings" s ON s.guild_id = c.discord_guild_id
JOIN (
  SELECT guild_id, owner_id AS user_id, created_at AS at FROM "halloween_candy_offers"
  UNION ALL
  SELECT guild_id, initiator_id, created_at FROM "halloween_candy_trades" WHERE initiator_id IS NOT NULL
  UNION ALL
  SELECT guild_id, owner_id, created_at FROM "halloween_candy_boards"
) activity ON activity.guild_id = c.discord_guild_id
WHERE c.halloween_enabled
  AND s.start_date IS NOT NULL
  AND EXTRACT(YEAR FROM s.start_date AT TIME ZONE 'America/Chicago') = 2026
  AND activity.at >= s.start_date
  AND (s.end_date IS NULL OR activity.at <= s.end_date)
  AND EXISTS (
    SELECT 1
    FROM "community_members" m
    JOIN "roles" r ON r.id = m.role_id
    WHERE r.community_id = c.id AND m.user_id = activity.user_id
  )
GROUP BY activity.user_id, c.id
ON CONFLICT ("user_id", "community_id", "slug") DO NOTHING;
