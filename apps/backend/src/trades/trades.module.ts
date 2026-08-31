import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { ItemTransactionsModule } from "../item-transactions/item-transactions.module";
import { CurrenciesModule } from "../currencies/currencies.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { TradesService } from "./trades.service";
import { TradesResolver } from "./trades.resolver";

// No AuthModule, for the same reason NotificationsModule does without it:
// `@AllowAnyAuthenticated` is metadata the globally registered guard reads, and
// importing AuthModule here would close a cycle back through UsersModule.
@Module({
  imports: [
    DatabaseModule,
    ItemTransactionsModule,
    CurrenciesModule,
    NotificationsModule,
  ],
  providers: [TradesService, TradesResolver],
  exports: [TradesService],
})
export class TradesModule {}
