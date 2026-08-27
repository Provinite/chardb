-- Deleting a user must not destroy their characters.
--
-- characters.owner_id was ON DELETE CASCADE, so removing a user permanently
-- erased every character they owned -- including ones that had only been
-- soft-deleted, and including history other users depend on (ownership
-- changes, comments, galleries). owner_id is nullable and the codebase already
-- models ownerless characters as "orphaned", so SET NULL is the correct
-- behavior: the character survives, unowned.

ALTER TABLE "characters" DROP CONSTRAINT "characters_owner_id_fkey";

ALTER TABLE "characters" ADD CONSTRAINT "characters_owner_id_fkey"
  FOREIGN KEY ("owner_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
