-- Adds `communities.slug`, the DNS label a community is served from.
--
-- Written by hand rather than generated, because the column is both NOT NULL
-- and UNIQUE on a table that already has rows: it has to arrive nullable, get
-- backfilled, and only then take its constraints. The backfill is deterministic
-- so that dev, staging and prod all derive the same slugs from the same names.
--
-- Derivation, in order: lowercase; every run of non-alphanumerics becomes one
-- hyphen; hyphens trimmed from both ends; truncated to 55 characters and
-- re-trimmed in case the cut landed on a hyphen; a name that normalises to
-- nothing, or to a reserved label, gets a `-community` suffix; and finally
-- collisions are broken by appending the row's rank, oldest community keeping
-- the bare slug. 55 rather than 63 leaves room for that suffix inside the
-- 63-character DNS label limit.

-- AlterTable
ALTER TABLE "communities" ADD COLUMN "slug" VARCHAR(63);

-- Backfill
WITH normalized AS (
  SELECT
    id,
    created_at,
    TRIM(BOTH '-' FROM LEFT(
      TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(name), '[^a-z0-9]+', '-', 'g')),
      55
    )) AS base
  FROM "communities"
),
guarded AS (
  SELECT
    id,
    created_at,
    CASE
      WHEN base = '' THEN 'community'
      WHEN base IN (
        'www', 'api', 'mail', 'smtp', 'imap', 'ftp', 'ns', 'ns1', 'ns2',
        'admin', 'app', 'auth', 'static', 'cdn', 'assets', 'img', 'images',
        'media', 'files', 'status', 'health', 'docs', 'doc', 'help',
        'support', 'blog', 'about', 'dev', 'staging', 'stage', 'test',
        'preview', 'localhost', 'chardb'
      ) THEN base || '-community'
      ELSE base
    END AS base
  FROM normalized
),
numbered AS (
  SELECT
    id,
    base,
    ROW_NUMBER() OVER (PARTITION BY base ORDER BY created_at, id) AS rn
  FROM guarded
)
UPDATE "communities" c
SET "slug" = CASE WHEN n.rn = 1 THEN n.base ELSE n.base || '-' || n.rn END
FROM numbered n
WHERE c.id = n.id;

-- Constraints, once every row has a value
ALTER TABLE "communities" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "communities_slug_key" ON "communities"("slug");
