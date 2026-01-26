-- Set canUploadOwnCharacterImages = true for ALL roles
-- (Everyone should be able to upload images to their own characters)
UPDATE "roles" SET "can_upload_own_character_images" = true;

-- Set canUploadCharacterImages = true for Admin and Moderator roles
-- (These roles can upload images to any character)
UPDATE "roles" SET "can_upload_character_images" = true
WHERE "name" IN ('Admin', 'Moderator');
