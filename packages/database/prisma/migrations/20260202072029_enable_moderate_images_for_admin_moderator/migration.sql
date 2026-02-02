-- Enable canModerateImages for existing Admin and Moderator roles
UPDATE "roles" SET "can_moderate_images" = true WHERE "name" IN ('Admin', 'Moderator');
