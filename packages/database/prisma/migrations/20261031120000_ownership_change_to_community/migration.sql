-- A character given to its community is left with no owner, and its
-- ownership change records that as a null recipient (#521).

-- AlterTable
ALTER TABLE "character_ownership_changes" ALTER COLUMN "to_user_id" DROP NOT NULL;
