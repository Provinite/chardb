-- Populate mainMediaId from mainImageId
-- This links characters to their main media record instead of directly to images
UPDATE "characters" 
SET "main_media_id" = "media"."id"
FROM "media"
WHERE "characters"."main_image_id" = "media"."content_id" 
  AND "media"."media_type" = 'IMAGE'
  AND "characters"."main_image_id" IS NOT NULL;