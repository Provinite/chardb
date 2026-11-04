-- Usernames compare without regard to case, so `foo` and `Foo` are one name:
-- lookups match either spelling and the unique index refuses the second.
-- The stored casing is kept for display.
--
-- Converting re-checks "users_username_key". If two existing rows differ only
-- in case, this fails and the deploy stops before anything is changed.
CREATE EXTENSION IF NOT EXISTS citext;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "username" SET DATA TYPE CITEXT;
