-- AlterTable
ALTER TABLE "media" ADD COLUMN     "community_id" TEXT;

-- AddForeignKey
--
-- SET NULL rather than CASCADE: this column says who reviews the upload, not
-- who owns it. Deleting a community must not take its members' avatars and
-- gallery pictures with it -- those fall back to the global queue, which is
-- where they would have been had the column never been set.
ALTER TABLE "media" ADD CONSTRAINT "media_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- No index on this column, deliberately.
--
-- The obvious one is unusable. Every query that reads it does so inside
-- `(species.community_id = $1 OR media.community_id = $1)`, and that OR spans
-- a join boundary -- one side is on `species`, the other on `media` -- so
-- Postgres cannot build a BitmapOr across it and never consults the index.
-- Measured at 200k media: zero scans from any application query, and no
-- difference in timing with it present or absent. See the moderation queue
-- indexes in the migration that follows for what actually moves the needle.
