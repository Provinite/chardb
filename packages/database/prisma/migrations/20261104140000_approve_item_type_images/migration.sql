-- Item type pictures are no longer moderated. Uploads already approve them;
-- one still waiting from before is approved here. No community queue lists
-- them: their media rows carry neither a character nor a community.
UPDATE "images" SET "moderation_status" = 'APPROVED'
 WHERE "moderation_status" = 'PENDING'
   AND "id" IN (SELECT "image_id" FROM "item_types" WHERE "image_id" IS NOT NULL);
