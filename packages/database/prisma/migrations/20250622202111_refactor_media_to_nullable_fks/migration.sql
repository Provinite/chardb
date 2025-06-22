-- Refactor media table from discriminated union to nullable FK approach
-- This migration safely transitions from media_type + content_id to nullable foreign keys

-- Step 1: Add new nullable FK columns
ALTER TABLE "media" ADD COLUMN "image_id" TEXT;
ALTER TABLE "media" ADD COLUMN "text_content_id" TEXT;

-- Step 2: Populate new columns based on existing media_type and content_id
UPDATE "media" 
SET "image_id" = "content_id" 
WHERE "media_type" = 'IMAGE';

UPDATE "media" 
SET "text_content_id" = "content_id" 
WHERE "media_type" = 'TEXT';

-- Step 3: Add foreign key constraints
ALTER TABLE "media" ADD CONSTRAINT "media_image_id_fkey" 
  FOREIGN KEY ("image_id") REFERENCES "images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "media" ADD CONSTRAINT "media_text_content_id_fkey" 
  FOREIGN KEY ("text_content_id") REFERENCES "text_content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 4: Add check constraint to ensure exactly one content reference
ALTER TABLE "media" ADD CONSTRAINT "media_exactly_one_content_check" 
  CHECK (
    ("image_id" IS NOT NULL)::int + 
    ("text_content_id" IS NOT NULL)::int = 1
  );

-- Step 5: Verify data integrity before dropping old columns
-- This will fail if there are any orphaned content_id references
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  -- Check for orphaned image references
  SELECT COUNT(*) INTO orphaned_count
  FROM "media" 
  WHERE "media_type" = 'IMAGE' 
    AND "content_id" NOT IN (SELECT "id" FROM "images");
  
  IF orphaned_count > 0 THEN
    RAISE EXCEPTION 'Found % orphaned image references in media table', orphaned_count;
  END IF;

  -- Check for orphaned text content references  
  SELECT COUNT(*) INTO orphaned_count
  FROM "media" 
  WHERE "media_type" = 'TEXT' 
    AND "content_id" NOT IN (SELECT "id" FROM "text_content");
    
  IF orphaned_count > 0 THEN
    RAISE EXCEPTION 'Found % orphaned text content references in media table', orphaned_count;
  END IF;
END $$;

-- Step 6: Drop old columns and enum (if no longer needed)
ALTER TABLE "media" DROP COLUMN "media_type";
ALTER TABLE "media" DROP COLUMN "content_id";

-- Note: We keep the MediaType enum in case it's used elsewhere
-- If it's only used for media table, it can be dropped with:
-- DROP TYPE "MediaType";