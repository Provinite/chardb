-- AlterTable
ALTER TABLE "media" ADD COLUMN     "community_id" TEXT;

-- AddForeignKey
--
-- SET NULL rather than CASCADE: this column says who reviews the upload, not
-- who owns it. Deleting a community must not take its members' avatars and
-- gallery pictures with it -- those fall back to the global queue, which is
-- where they would have been had the column never been set.
ALTER TABLE "media" ADD CONSTRAINT "media_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
--
-- The community moderation queue reads this column, and nothing else ever
-- will. Partial, because the overwhelming majority of rows are character
-- uploads that resolve their community through the character instead and
-- leave this null -- indexing those costs space to answer a question nobody
-- asks.
CREATE INDEX "media_community_id_idx" ON "media"("community_id") WHERE "community_id" IS NOT NULL;
