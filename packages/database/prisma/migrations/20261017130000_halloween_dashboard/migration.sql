-- AlterTable
ALTER TABLE "communities" ADD COLUMN "halloween_enabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "halloween_knock_events" ADD COLUMN "delivered_at" TIMESTAMPTZ,
ADD COLUMN "delivered_by_id" TEXT;

-- AddForeignKey
ALTER TABLE "halloween_knock_events" ADD CONSTRAINT "halloween_knock_events_delivered_by_id_fkey" FOREIGN KEY ("delivered_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
