-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "can_grant_items" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "can_manage_items" BOOLEAN NOT NULL DEFAULT false;

-- Grant item permissions to Admin role (full item management)
UPDATE "roles"
SET "can_manage_items" = true, "can_grant_items" = true
WHERE "name" = 'Admin';

-- Grant item granting permission to Moderator role
UPDATE "roles"
SET "can_grant_items" = true
WHERE "name" = 'Moderator';
