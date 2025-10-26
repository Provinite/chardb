-- AlterTable
ALTER TABLE "characters" ADD COLUMN "details" TEXT;

-- Data migration: Populate details field from existing description, personality, and backstory fields
UPDATE "characters"
SET "details" = TRIM(
  CONCAT(
    CASE
      WHEN description IS NOT NULL AND description != ''
      THEN '# Description' || E'\n\n' || description
      ELSE ''
    END,
    CASE
      WHEN personality IS NOT NULL AND personality != ''
      THEN CASE WHEN description IS NOT NULL AND description != '' THEN E'\n\n' ELSE '' END || '# Personality' || E'\n\n' || personality
      ELSE ''
    END,
    CASE
      WHEN backstory IS NOT NULL AND backstory != ''
      THEN CASE WHEN (description IS NOT NULL AND description != '') OR (personality IS NOT NULL AND personality != '') THEN E'\n\n' ELSE '' END || '# Backstory' || E'\n\n' || backstory
      ELSE ''
    END
  )
)
WHERE description IS NOT NULL AND description != ''
   OR personality IS NOT NULL AND personality != ''
   OR backstory IS NOT NULL AND backstory != '';
