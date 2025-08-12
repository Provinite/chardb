/*
  Add displayName field to tags table with backfill for existing data
*/

-- Step 1: Add displayName column as nullable
ALTER TABLE "tags" ADD COLUMN "display_name" VARCHAR(50);

-- Step 2: Backfill with current name values
UPDATE "tags" SET "display_name" = "name";

-- Step 3: Make displayName not-null after backfill
ALTER TABLE "tags" ALTER COLUMN "display_name" SET NOT NULL;
