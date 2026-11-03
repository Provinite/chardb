-- AlterTable
ALTER TABLE "galleries" ADD COLUMN     "community_id" TEXT;

-- AddForeignKey
--
-- SET NULL rather than CASCADE, as for `media.community_id`: the column says
-- which community lists the gallery, not who owns it.
ALTER TABLE "galleries" ADD CONSTRAINT "galleries_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- No index, for the reason given on `media.community_id`: every read is inside
-- an OR with `species.community_id`, which Postgres cannot serve from it.
