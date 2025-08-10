-- Data Migration: Populate Media table from existing Images
INSERT INTO "media" (
    "id",
    "title", 
    "description",
    "owner_id",
    "character_id", 
    "gallery_id",
    "visibility",
    "media_type",
    "content_id",
    "created_at",
    "updated_at"
)
SELECT 
    gen_random_uuid() as "id",
    COALESCE("alt_text", "original_filename", 'Untitled Image') as "title",
    "description",
    "uploader_id" as "owner_id",
    "character_id",
    "gallery_id", 
    "visibility",
    'IMAGE'::"MediaType" as "media_type",
    "id" as "content_id",
    "created_at",
    "updated_at"
FROM "images";