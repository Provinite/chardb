-- AlterTable
ALTER TABLE "galleries" ADD COLUMN     "community_id" TEXT;

-- AddForeignKey
--
-- SET NULL rather than CASCADE, as for `media.community_id`: the column says
-- which community lists the gallery, not who owns it.
ALTER TABLE "galleries" ADD CONSTRAINT "galleries_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- No index, for the reason given on `media.community_id`: every read is inside
-- an OR with `species.community_id`, which Postgres cannot serve from it.

-- Backfill: a characterless gallery whose media all belong to one community
-- (each through its character, else `media.community_id`) is filed under it.
-- A gallery with any media that belongs nowhere, or to two communities, is
-- left alone and stays apex-only.
UPDATE "galleries" AS g
SET "community_id" = filed.community_id
FROM (
  SELECT m."gallery_id", MIN(COALESCE(s."community_id", m."community_id")) AS community_id
  FROM "media" m
  LEFT JOIN "characters" c ON c."id" = m."character_id"
  LEFT JOIN "species" s ON s."id" = c."species_id"
  WHERE m."gallery_id" IS NOT NULL
  GROUP BY m."gallery_id"
  HAVING COUNT(DISTINCT COALESCE(s."community_id", m."community_id")) = 1
     AND COUNT(*) = COUNT(COALESCE(s."community_id", m."community_id"))
) AS filed
WHERE g."id" = filed."gallery_id"
  AND g."character_id" IS NULL;

-- One production gallery the rule above cannot place: its media names no
-- community, but it is Cloverse's. Matches nothing where either row is absent.
UPDATE "galleries"
SET "community_id" = '3525edda-e660-4157-8158-d2308677aa0b'
WHERE "id" = 'f74aafa9-b07e-4297-afbb-d8462f723235'
  AND EXISTS (
    SELECT 1 FROM "communities" WHERE "id" = '3525edda-e660-4157-8158-d2308677aa0b'
  );
