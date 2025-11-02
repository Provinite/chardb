-- Set can_create_orphaned_character to TRUE for Admin roles
UPDATE "roles" SET "can_create_orphaned_character" = true WHERE UPPER("name") = 'ADMIN';

-- Set can_create_orphaned_character to TRUE for Moderator roles
UPDATE "roles" SET "can_create_orphaned_character" = true WHERE UPPER("name") = 'MODERATOR';
