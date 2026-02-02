-- Create ModerationStatus enum
CREATE TYPE "ModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- Create ModerationRejectionReason enum
CREATE TYPE "ModerationRejectionReason" AS ENUM ('TOS_VIOLATION', 'NSFW_NOT_TAGGED', 'SPAM_LOW_QUALITY', 'COPYRIGHT_ISSUE', 'OTHER');

-- Add moderation_status column to images table
ALTER TABLE "images" ADD COLUMN "moderation_status" "ModerationStatus" NOT NULL DEFAULT 'PENDING';

-- Set existing images to APPROVED so they remain visible
UPDATE "images" SET "moderation_status" = 'APPROVED';

-- Add can_moderate_images permission to roles table
ALTER TABLE "roles" ADD COLUMN "can_moderate_images" BOOLEAN NOT NULL DEFAULT false;

-- Create image_moderation_actions table for audit trail
CREATE TABLE "image_moderation_actions" (
    "id" TEXT NOT NULL,
    "image_id" TEXT NOT NULL,
    "moderator_id" TEXT NOT NULL,
    "action" "ModerationStatus" NOT NULL,
    "reason" "ModerationRejectionReason",
    "reason_text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "image_moderation_actions_pkey" PRIMARY KEY ("id")
);

-- Add indexes for efficient queries
CREATE INDEX "image_moderation_actions_image_id_idx" ON "image_moderation_actions"("image_id");
CREATE INDEX "image_moderation_actions_moderator_id_idx" ON "image_moderation_actions"("moderator_id");

-- Add foreign key constraints
ALTER TABLE "image_moderation_actions" ADD CONSTRAINT "image_moderation_actions_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "images"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "image_moderation_actions" ADD CONSTRAINT "image_moderation_actions_moderator_id_fkey" FOREIGN KEY ("moderator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
