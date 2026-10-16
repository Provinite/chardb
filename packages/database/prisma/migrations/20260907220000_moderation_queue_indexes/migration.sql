-- Indexes for the image moderation queue.
--
-- Before these, `images` carried nothing but its primary key: no index on
-- `moderation_status`, none on `deferred_at`. Finding the handful of pending
-- uploads meant reading every image ever uploaded, and the queue's cost grew
-- with the size of the archive rather than the size of the backlog.
--
-- Measured on 200k media / 200k images / 200k characters with a 1000-image
-- backlog, median of 15 runs:
--
--                                    before      after
--   community image queue           128.1 ms     0.5 ms
--   community media queue            56.2 ms    40.8 ms
--   pending count                    53.0 ms    36.1 ms
--
-- The media-side queue keeps its floor because Prisma sorts it by
-- `images.deferred_at`, a column on a joined table, so the LIMIT cannot be
-- pushed down and every media row is read and sorted regardless. That is a
-- query-shape problem, not an index problem, and is left alone here.
--
-- `characters(species_id)` was measured and deliberately omitted: it made
-- every query slightly slower, and the existing `(species_id, registry_id)`
-- unique index already serves lookups on the leading column.

-- CreateIndex
--
-- Partial, and this one is NOT declared in schema.prisma, because Prisma
-- cannot express either half of what makes it work: the WHERE clause or the
-- NULLS FIRST ordering.
--
-- Both halves are load-bearing. NULLS FIRST is what lets the index satisfy
-- the queue's ORDER BY -- the queue sorts undeferred images ahead of deferred
-- ones, and a plain ASC index (which is NULLS LAST) cannot answer that, so
-- Postgres falls back to a sequential scan and a sort: 31.6 ms rather than
-- 0.5 ms, measured. The WHERE clause is what makes it small: only pending
-- rows are indexed, so it is 48 kB against the 8 MB a full composite costs,
-- and an approval drops a row out of it rather than rewriting one.
--
-- Being invisible to Prisma turns out to be safe rather than merely tolerable:
-- `prisma migrate diff` reports no drift in either direction, because Prisma
-- ignores indexes it cannot represent rather than proposing to drop them.
-- (Checked against 5.22; worth re-checking on a major upgrade.) What it does
-- mean is that this index exists only here -- squash or regenerate the
-- migration history and it goes with it, silently, and the queue quietly
-- returns to reading every image ever uploaded.
CREATE INDEX "images_pending_moderation_idx"
  ON "images" ("deferred_at" NULLS FIRST, "created_at")
  WHERE "moderation_status" = 'PENDING';

-- CreateIndex
--
-- Both of these are declared in schema.prisma as well, so Prisma knows about
-- them. `image_id` is what lets the queue walk from a pending image to the
-- media that carries it; `character_id` keeps the planner off a sequential
-- scan once `image_id` exists, and the two only pay off together.
CREATE INDEX "media_image_id_idx" ON "media"("image_id");

-- CreateIndex
CREATE INDEX "media_character_id_idx" ON "media"("character_id");
