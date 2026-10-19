-- One community per Discord server. The Halloween event decides whose
-- settings and prizes an admin can change by this column, so two communities
-- claiming the same server would let either edit the other's event.
--
-- Fails if two communities already share a server; unlink one first.
CREATE UNIQUE INDEX "communities_discord_guild_id_key" ON "communities"("discord_guild_id");
