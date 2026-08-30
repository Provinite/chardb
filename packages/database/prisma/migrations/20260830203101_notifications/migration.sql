-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('FOLLOW_RECEIVED', 'COMMENT_RECEIVED', 'ITEM_GRANTED', 'ITEM_REVOKED', 'CURRENCY_RECEIVED');

-- CreateEnum
CREATE TYPE "NotificationSubjectType" AS ENUM ('CHARACTER', 'COMMENT', 'GALLERY', 'IMAGE', 'MEDIA', 'ITEM', 'CURRENCY', 'USER');

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "actor_user_id" TEXT,
    "actor_label" VARCHAR(50),
    "community_id" TEXT,
    "body" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "subject_type" "NotificationSubjectType",
    "subject_id" TEXT,
    "seen_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_recipient_id_created_at_idx" ON "notifications"("recipient_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_recipient_id_seen_at_idx" ON "notifications"("recipient_id", "seen_at");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CheckConstraint: every notification names exactly one kind of actor.
--
-- Either a user caused it, or something that is not a user did and says so by
-- name. Both at once is a contradiction, and neither leaves the UI with nothing
-- to put in the sentence -- "someone granted you an item" is not worth sending.
-- Enforced here because every future producer has to get this right, and the
-- likely failure is a new one forgetting the label on a system-authored row.
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_exactly_one"
  CHECK (("actor_user_id" IS NULL) = ("actor_label" IS NOT NULL));

-- CheckConstraint: the subject pair is coherent.
--
-- A type without an id names nothing to open, and an id without a type cannot
-- be routed anywhere. Either the notification links somewhere or it does not;
-- half a link is a dead click.
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_subject_pair"
  CHECK (("subject_type" IS NULL) = ("subject_id" IS NULL));
