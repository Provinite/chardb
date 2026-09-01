-- One pending trait review per character, enforced by the database.
--
-- `TraitReviewService.createReview` has always checked this with a read
-- before its insert, which is not a guarantee: under READ COMMITTED two
-- concurrent requests both see no pending review and both insert. That was
-- survivable while reviews were only created alongside the character they
-- belonged to. Edit kits make it reachable -- two kits spent on the same
-- character at once would leave two pending reviews and two spent kits.
--
-- A partial unique index is the only way to say this in Postgres, and Prisma
-- cannot express one, so it is written by hand here.

-- Any character that already has more than one pending review keeps the most
-- recent and has the rest cancelled. Deliberately CANCELLED rather than
-- deleted: they are moderation records, and a row that vanishes is worse than
-- one that says it was set aside. Expected to affect nothing -- the
-- application check has been in place since reviews were introduced -- but a
-- migration that fails on live data is not worth the gamble.
UPDATE "trait_reviews" tr
SET "status" = 'CANCELLED',
    "resolved_at" = NOW(),
    "rejection_reason" = 'Superseded: this character had more than one pending review when the one-pending-per-character constraint was added.'
WHERE tr."status" = 'PENDING'
  AND tr."id" <> (
    SELECT newest."id"
    FROM "trait_reviews" newest
    WHERE newest."character_id" = tr."character_id"
      AND newest."status" = 'PENDING'
    ORDER BY newest."created_at" DESC, newest."id" DESC
    LIMIT 1
  );

CREATE UNIQUE INDEX "trait_reviews_one_pending_per_character"
  ON "trait_reviews" ("character_id")
  WHERE "status" = 'PENDING';
