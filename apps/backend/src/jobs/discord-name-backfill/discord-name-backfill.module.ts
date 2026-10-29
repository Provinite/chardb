import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { DiscordModule } from "../../discord/discord.module";
import { PendingOwnershipModule } from "../../pending-ownership/pending-ownership.module";
import { DiscordNameBackfillService } from "./discord-name-backfill.service";
import { DiscordNameBackfillResolver } from "./discord-name-backfill.resolver";

@Module({
  imports: [DatabaseModule, DiscordModule, PendingOwnershipModule],
  providers: [DiscordNameBackfillService, DiscordNameBackfillResolver],
})
export class DiscordNameBackfillModule {}
