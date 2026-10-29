import { Module, forwardRef } from "@nestjs/common";
import { ExternalAccountsService } from "./external-accounts.service";
import { ExternalAccountsResolver } from "./external-accounts.resolver";
import { DatabaseModule } from "../database/database.module";
import { PendingOwnershipModule } from "../pending-ownership/pending-ownership.module";
import { DiscordModule } from "../discord/discord.module";

@Module({
  imports: [
    DatabaseModule,
    DiscordModule,
    forwardRef(() => PendingOwnershipModule),
  ],
  providers: [ExternalAccountsService, ExternalAccountsResolver],
  exports: [ExternalAccountsService],
})
export class ExternalAccountsModule {}
