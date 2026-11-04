-- Item type pictures are no longer moderated, and their media now belongs to
-- the item type's community. Uploads already do both; this catches up the
-- ones from before.
--
-- An item type can be pointed at any image by id, so only a picture that
-- looks like an item type upload qualifies: one community's item types use
-- it, its uploader is a member there, and no media row puts it on a
-- character or in a gallery. Anything else is left to moderation.
CREATE TEMP TABLE "item_type_pictures" ON COMMIT DROP AS
SELECT it."image_id", MIN(it."community_id") AS "community_id"
  FROM "item_types" it
  JOIN "images" i ON i."id" = it."image_id"
 WHERE EXISTS (SELECT 1 FROM "community_members" cm
                 JOIN "roles" r ON r."id" = cm."role_id"
                WHERE cm."user_id" = i."uploader_id"
                  AND r."community_id" = it."community_id")
   AND NOT EXISTS (SELECT 1 FROM "media" m
                    WHERE m."image_id" = it."image_id"
                      AND (m."character_id" IS NOT NULL OR m."gallery_id" IS NOT NULL))
 GROUP BY it."image_id"
HAVING COUNT(DISTINCT it."community_id") = 1;

UPDATE "images" SET "moderation_status" = 'APPROVED'
 WHERE "moderation_status" = 'PENDING'
   AND "id" IN (SELECT "image_id" FROM "item_type_pictures");

UPDATE "media" SET "community_id" = p."community_id"
  FROM "item_type_pictures" p
 WHERE p."image_id" = "media"."image_id"
   AND "media"."community_id" IS NULL;
