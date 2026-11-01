-- CreateIndex
CREATE INDEX "halloween_gifties_knock_event_id_idx" ON "halloween_gifties"("knock_event_id");

-- CreateIndex
CREATE INDEX "halloween_gifties_guild_id_time_idx" ON "halloween_gifties"("guild_id", "time");

-- CreateIndex
CREATE INDEX "halloween_knock_events_guild_id_time_idx" ON "halloween_knock_events"("guild_id", "time");
