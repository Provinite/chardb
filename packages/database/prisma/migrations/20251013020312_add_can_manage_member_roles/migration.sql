-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "can_manage_member_roles" BOOLEAN NOT NULL DEFAULT false;

-- Set can_manage_member_roles to TRUE for all ADMIN roles
UPDATE "roles" SET "can_manage_member_roles" = true WHERE UPPER("name") = 'ADMIN';
