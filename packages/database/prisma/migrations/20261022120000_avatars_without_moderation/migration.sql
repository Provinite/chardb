-- Avatars are no longer moderated and no longer have Media rows (#410).
--
-- The flag moves from the avatar's Media row to its Image. Every image that is
-- someone's avatar now, and every image an avatar Media row carried (including
-- avatars since replaced, kept alive only by that row), is marked, so a later
-- sweep can find the ones nobody uses -- except an image that is also a post.
-- Before #410 any picture of yours could be your avatar, and one still shown
-- by a gallery or character must never look like rubbish to that sweep.
ALTER TABLE "images" ADD COLUMN "is_avatar_upload" BOOLEAN NOT NULL DEFAULT false;

UPDATE "images" SET "is_avatar_upload" = true
 WHERE ("id" IN (SELECT "avatar_image_id" FROM "users" WHERE "avatar_image_id" IS NOT NULL)
     OR "id" IN (SELECT "image_id" FROM "media" WHERE "is_avatar_upload" = true AND "image_id" IS NOT NULL))
   AND NOT EXISTS (SELECT 1 FROM "media" m
                    WHERE m."image_id" = "images"."id" AND m."is_avatar_upload" = false);

-- An avatar is now served on the flag rather than on approval, so one a
-- moderator rejected would start showing. Take it off the profile instead.
UPDATE "users" SET "avatar_image_id" = NULL
 WHERE "avatar_image_id" IN (SELECT "id" FROM "images" WHERE "moderation_status" = 'REJECTED');

-- Nothing will ever review an avatar again; one still waiting is approved.
UPDATE "images" SET "moderation_status" = 'APPROVED'
 WHERE "is_avatar_upload" = true AND "moderation_status" = 'PENDING';

-- The rows that carried avatars through moderation. Their images stay.
DELETE FROM "media" WHERE "is_avatar_upload" = true;

ALTER TABLE "media" DROP COLUMN "is_avatar_upload";
