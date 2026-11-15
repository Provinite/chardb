import { Module, forwardRef } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { PendingOwnershipService } from "./pending-ownership.service";
import { PendingOwnershipResolver } from "./pending-ownership.resolver";
import { ExternalAccountsModule } from "../external-accounts/external-accounts.module";
import { ItemTransactionsModule } from "../item-transactions/item-transactions.module";
import { CurrenciesModule } from "../currencies/currencies.module";

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => AuthModule),
    forwardRef(() => ExternalAccountsModule),
    ItemTransactionsModule,
    // Crediting claimed currency grants (#610). forwardRef: CurrenciesModule
    // reaches AuthModule, which comes back here through ItemsModule.
    forwardRef(() => CurrenciesModule),
  ],
  providers: [PendingOwnershipService, PendingOwnershipResolver],
  exports: [PendingOwnershipService],
})
export class PendingOwnershipModule {}
