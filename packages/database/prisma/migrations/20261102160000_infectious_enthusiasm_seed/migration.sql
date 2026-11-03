-- Infectious Enthusiasm 2026 passes from whoever has it to whoever they swap
-- candy with. Staff (a role that can grant or manage items) and site admins
-- start with it, as of their event's start; then every swap of the event so
-- far is replayed in order, so it spreads as it would have had it existed
-- from the start. Only members catch it. Safe to run again.
DO $$
DECLARE
  t RECORD;
BEGIN
  INSERT INTO "user_achievements" ("id", "user_id", "community_id", "slug", "earned_at")
  SELECT gen_random_uuid()::text, staff.user_id, staff.community_id, 'infectious-enthusiasm-2026', staff.start_date
  FROM (
    SELECT DISTINCT m."user_id", c."id" AS community_id, s."start_date"
    FROM "communities" c
    JOIN "halloween_guild_settings" s ON s."guild_id" = c."discord_guild_id"
    JOIN "roles" r ON r."community_id" = c."id"
    JOIN "community_members" m ON m."role_id" = r."id"
    JOIN "users" u ON u."id" = m."user_id"
    WHERE c."halloween_enabled"
      AND s."start_date" IS NOT NULL
      AND EXTRACT(YEAR FROM s."start_date" AT TIME ZONE 'America/Chicago') = 2026
      AND (r."can_grant_items" OR r."can_manage_items" OR u."is_admin")
  ) staff
  ON CONFLICT ("user_id", "community_id", "slug") DO NOTHING;

  FOR t IN
    SELECT tr."initiator_id", tr."offerer_id", tr."created_at", c."id" AS community_id
    FROM "halloween_candy_trades" tr
    JOIN "communities" c ON c."discord_guild_id" = tr."guild_id"
    JOIN "halloween_guild_settings" s ON s."guild_id" = tr."guild_id"
    WHERE c."halloween_enabled"
      AND s."start_date" IS NOT NULL
      AND EXTRACT(YEAR FROM s."start_date" AT TIME ZONE 'America/Chicago') = 2026
      AND tr."created_at" >= s."start_date"
      AND (s."end_date" IS NULL OR tr."created_at" <= s."end_date")
      AND tr."initiator_id" IS NOT NULL
      AND tr."offerer_id" IS NOT NULL
    ORDER BY tr."created_at", tr."id"
  LOOP
    INSERT INTO "user_achievements" ("id", "user_id", "community_id", "slug", "earned_at")
    SELECT gen_random_uuid()::text, pair.catcher_id, t.community_id, 'infectious-enthusiasm-2026', t."created_at"
    FROM (
      VALUES (t."initiator_id", t."offerer_id"), (t."offerer_id", t."initiator_id")
    ) AS pair(catcher_id, carrier_id)
    WHERE EXISTS (
        SELECT 1 FROM "user_achievements" a
        WHERE a."user_id" = pair.carrier_id
          AND a."community_id" = t.community_id
          AND a."slug" = 'infectious-enthusiasm-2026'
          AND a."earned_at" <= t."created_at"
      )
      AND EXISTS (
        SELECT 1
        FROM "community_members" m
        JOIN "roles" r ON r."id" = m."role_id"
        WHERE r."community_id" = t.community_id AND m."user_id" = pair.catcher_id
      )
    ON CONFLICT ("user_id", "community_id", "slug") DO NOTHING;
  END LOOP;
END $$;
