-- Door knocks: a member knocks on another's door, and each gets 1-3 candies.

-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'HALLOWEEN_DOOR_KNOCKED';

-- AlterEnum
ALTER TYPE "NotificationSubjectType" ADD VALUE 'HALLOWEEN_DOOR_KNOCK';

-- AlterTable
ALTER TABLE "halloween_candies" ADD COLUMN     "door_knock_id" INTEGER;

-- CreateTable
CREATE TABLE "halloween_door_knocks" (
    "id" SERIAL NOT NULL,
    "guild_id" VARCHAR(30) NOT NULL,
    "knocker_id" TEXT NOT NULL,
    "knockee_id" TEXT NOT NULL,
    "time" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "halloween_door_knocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "halloween_door_knocks_guild_id_knocker_id_time_idx" ON "halloween_door_knocks"("guild_id", "knocker_id", "time");

-- CreateIndex
CREATE INDEX "halloween_door_knocks_knockee_id_idx" ON "halloween_door_knocks"("knockee_id");

-- CreateIndex
CREATE INDEX "halloween_candies_door_knock_id_idx" ON "halloween_candies"("door_knock_id");

-- AddForeignKey
ALTER TABLE "halloween_candies" ADD CONSTRAINT "halloween_candies_door_knock_id_fkey" FOREIGN KEY ("door_knock_id") REFERENCES "halloween_door_knocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "halloween_door_knocks" ADD CONSTRAINT "halloween_door_knocks_knocker_id_fkey" FOREIGN KEY ("knocker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "halloween_door_knocks" ADD CONSTRAINT "halloween_door_knocks_knockee_id_fkey" FOREIGN KEY ("knockee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
