import { Module } from "@nestjs/common";
import { ExternalAccountsService } from "./external-accounts.service";
import { ExternalAccountsResolver } from "./external-accounts.resolver";
import { DatabaseModule } from "../database/database.module";
import { PendingOwnershipModule } from "../pending-ownership/pending-ownership.module";

@Module({
  imports: [DatabaseModule, PendingOwnershipModule],
  providers: [ExternalAccountsService, ExternalAccountsResolver],
  exports: [ExternalAccountsService],
})
export class ExternalAccountsModule {}
