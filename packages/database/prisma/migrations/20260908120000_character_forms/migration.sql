-- A character may present as more than one creature: a *form* is one
-- appearance, with its own trait set, hanging off the one masterlist entry.
-- See CharacterForm in schema.prisma for why forms share the character's
-- variant instead of carrying their own.
--
-- The order of the steps below is load-bearing. The form rows must exist
-- before the review and audit snapshots are rewritten, because each rewritten
-- snapshot embeds the id of the form it describes; and `characters.trait_values`
-- must survive until both are done, because it is the source for both.

-- CreateTable
CREATE TABLE "character_forms" (
    "id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "trait_values" JSONB NOT NULL DEFAULT '[]',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "character_forms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "character_forms_character_id_sort_order_idx" ON "character_forms"("character_id", "sort_order");

-- AddForeignKey
ALTER TABLE "character_forms" ADD CONSTRAINT "character_forms_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Every character that exists had exactly one trait set, so every character
-- gets exactly one form to hold it. Soft-deleted characters included: they can
-- be restored, and a restored character with no form would render as though
-- its traits had been erased.
INSERT INTO "character_forms" ("id", "character_id", "name", "trait_values", "sort_order", "created_at", "updated_at")
SELECT
  gen_random_uuid(),
  c."id",
  'Base',
  c."trait_values",
  0,
  c."created_at",
  CURRENT_TIMESTAMP
FROM "characters" c;

-- AlterTable
--
-- One form per character stays the rule everywhere until a community raises
-- it, so every variant that predates forms keeps behaving exactly as it did.
ALTER TABLE "species_variants" ADD COLUMN "max_forms" INTEGER NOT NULL DEFAULT 1;

-- A review and a variant change each snapshot the whole character rather than
-- one form, so their trait blobs become form-keyed. Renaming the columns
-- rather than adding new ones is the point: a second column holding "the trait
-- values" beside one holding "the forms" would be two answers to one question.
--
-- The rewrite is total -- a pre-forms character genuinely had one form, so no
-- row is guessed at. `name` and `sort_order` are copied into the snapshot
-- because it has to stay readable after the form itself is gone.

-- AlterTable
ALTER TABLE "trait_reviews" RENAME COLUMN "proposed_trait_values" TO "proposed_forms";
ALTER TABLE "trait_reviews" RENAME COLUMN "previous_trait_values" TO "previous_forms";
ALTER TABLE "trait_reviews" RENAME COLUMN "applied_trait_values" TO "applied_forms";

UPDATE "trait_reviews" r
SET
  "proposed_forms" = jsonb_build_array(jsonb_build_object(
    'formId', f."id", 'name', f."name", 'sortOrder', f."sort_order",
    'traitValues', r."proposed_forms")),
  "previous_forms" = jsonb_build_array(jsonb_build_object(
    'formId', f."id", 'name', f."name", 'sortOrder', f."sort_order",
    'traitValues', r."previous_forms")),
  -- Null means "approved exactly as proposed" and must stay null.
  "applied_forms" = CASE
    WHEN r."applied_forms" IS NULL THEN NULL
    ELSE jsonb_build_array(jsonb_build_object(
      'formId', f."id", 'name', f."name", 'sortOrder', f."sort_order",
      'traitValues', r."applied_forms"))
  END
FROM "character_forms" f
WHERE f."character_id" = r."character_id";

-- AlterTable
ALTER TABLE "character_variant_changes" RENAME COLUMN "previous_trait_values" TO "previous_forms";
ALTER TABLE "character_variant_changes" RENAME COLUMN "new_trait_values" TO "new_forms";

UPDATE "character_variant_changes" v
SET
  "previous_forms" = jsonb_build_array(jsonb_build_object(
    'formId', f."id", 'name', f."name", 'sortOrder', f."sort_order",
    'traitValues', v."previous_forms")),
  "new_forms" = jsonb_build_array(jsonb_build_object(
    'formId', f."id", 'name', f."name", 'sortOrder', f."sort_order",
    'traitValues', v."new_forms"))
FROM "character_forms" f
WHERE f."character_id" = v."character_id";

-- DropIndex
--
-- The GIN index went in with the column and was never queried: nothing in the
-- codebase filters characters by trait value, in Prisma or in raw SQL. It goes
-- with the column rather than being moved onto character_forms, so that
-- whoever eventually needs trait search adds the index the query wants.
DROP INDEX IF EXISTS "character_traitvalues_gin_idx";

-- AlterTable
ALTER TABLE "characters" DROP COLUMN "trait_values";
