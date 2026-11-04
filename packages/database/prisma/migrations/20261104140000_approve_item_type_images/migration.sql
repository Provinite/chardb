-- Item type pictures are no longer moderated. Uploads already approve them;
-- one still waiting from before is approved here. Only an image no character
-- or gallery post also shows: an item type can be pointed at any image by id,
-- and that must not approve someone's pending post.
UPDATE "images" SET "moderation_status" = 'APPROVED'
 WHERE "moderation_status" = 'PENDING'
   AND "id" IN (SELECT "image_id" FROM "item_types" WHERE "image_id" IS NOT NULL)
   AND NOT EXISTS (SELECT 1 FROM "media" m
                    WHERE m."image_id" = "images"."id"
                      AND (m."character_id" IS NOT NULL OR m."gallery_id" IS NOT NULL));

-- An item type picture's media now belongs to the item type's community.
-- Ones uploaded before carry no community, so file them there too.
UPDATE "media" SET "community_id" = it."community_id"
  FROM "item_types" it
 WHERE it."image_id" = "media"."image_id"
   AND "media"."community_id" IS NULL
   AND "media"."character_id" IS NULL;
