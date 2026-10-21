-- A player's DeviantArt name is theirs, not the event's: it can be saved with
-- /deviantart before the guild's event is set up on chardb.
ALTER TABLE "halloween_deviantart_users" DROP CONSTRAINT "halloween_deviantart_users_guild_id_fkey";
