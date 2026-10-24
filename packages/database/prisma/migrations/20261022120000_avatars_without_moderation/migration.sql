-- Avatars are no longer moderated and no longer have Media rows (#410).
--
-- The flag moves from the avatar's Media row to its Image. Every image that is
-- someone's avatar now, and every image an avatar Media row carried (including
-- avatars since replaced, kept alive only by that row), is marked, so the
-- sweep in #412 can find the ones nobody uses -- except an image that is also
-- a post.
-- Before #410 any picture of yours could be your avatar, and one still shown
-- by a gallery or character must never look like rubbish to that sweep.
ALTER TABLE "images" ADD COLUMN "is_avatar_upload" BOOLEAN NOT NULL DEFAULT false;

UPDATE "images" SET "is_avatar_upload" = true
 WHERE ("id" IN (SELECT "avatar_image_id" FROM "users" WHERE "avatar_image_id" IS NOT NULL)
     OR "id" IN (SELECT "image_id" FROM "media" WHERE "is_avatar_upload" = true AND "image_id" IS NOT NULL))
   AND NOT EXISTS (SELECT 1 FROM "media" m
                    WHERE m."image_id" = "images"."id" AND m."is_avatar_upload" = false);

-- Nothing will ever review an avatar again; one still waiting is approved.
UPDATE "images" SET "moderation_status" = 'APPROVED'
 WHERE "is_avatar_upload" = true AND "moderation_status" = 'PENDING';

-- From here on, an avatar that is set is an avatar that is shown. Whatever is
-- still not APPROVED -- a rejected avatar, or a post chosen as one while it
-- was pending -- is never served (`UsersResolver.resolveAvatarImage` shows
-- only APPROVED images), and the settings page no longer says why or offers
-- to remove it. Take it off the profile so the owner sees their initials and
-- can upload another. Nothing can make a set avatar unapproved afterwards:
-- avatars are created APPROVED, `updateProfile` can only remove one, and
-- `rejectImage` only rejects PENDING images.
UPDATE "users" SET "avatar_image_id" = NULL
 WHERE "avatar_image_id" IN (SELECT "id" FROM "images" WHERE "moderation_status" <> 'APPROVED');

-- The rows that carried avatars through moderation. Their images stay; the
-- ones this leaves unreferenced are #412's.
DELETE FROM "media" WHERE "is_avatar_upload" = true;

ALTER TABLE "media" DROP COLUMN "is_avatar_upload";
