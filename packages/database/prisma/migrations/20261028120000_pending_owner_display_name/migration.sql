-- A pending owner's display name on the provider (Discord's global_name),
-- beside the handle already in display_identifier, so staff can find someone
-- with no account here by either (#445).

-- AlterTable
ALTER TABLE "pending_ownership" ADD COLUMN     "display_name" VARCHAR(255);
