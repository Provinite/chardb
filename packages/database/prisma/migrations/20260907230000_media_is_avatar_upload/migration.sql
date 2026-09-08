-- AlterTable
--
-- Marks the media rows that exist only to carry an avatar through moderation,
-- so the listings can skip them. NOT NULL with a false default, so every row
-- already in the table is backfilled as "an ordinary upload" -- which is what
-- they all are: nothing could set an avatar before the migration that added
-- the write path, so no existing row could have come from one.
ALTER TABLE "media" ADD COLUMN "is_avatar_upload" BOOLEAN NOT NULL DEFAULT false;

-- No index. The listings filter for `is_avatar_upload = false`, which is
-- almost every row, so an index on it could not narrow anything; and nothing
-- looks for the true rows on their own. Worth adding the day something does.
