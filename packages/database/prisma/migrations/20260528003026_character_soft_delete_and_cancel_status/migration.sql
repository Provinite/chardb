-- AlterEnum
ALTER TYPE "ModerationStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "characters" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by_id" TEXT;

-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "can_delete_character" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
