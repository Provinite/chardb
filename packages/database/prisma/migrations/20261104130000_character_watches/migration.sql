-- Character watches: members hear when a character's trade advertisement changes.

-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'CHARACTER_AVAILABILITY_CHANGED';

-- CreateTable
CREATE TABLE "character_watches" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "character_watches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "character_watches_character_id_idx" ON "character_watches"("character_id");

-- CreateIndex
CREATE UNIQUE INDEX "character_watches_user_id_character_id_key" ON "character_watches"("user_id", "character_id");

-- AddForeignKey
ALTER TABLE "character_watches" ADD CONSTRAINT "character_watches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_watches" ADD CONSTRAINT "character_watches_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
