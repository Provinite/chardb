import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { CurrenciesService } from "./currencies.service";
import { CurrencyLedgerService } from "./currency-ledger.service";
import {
  CurrenciesResolver,
  CurrencyTransactionFieldsResolver,
  CurrencyBalanceFieldsResolver,
} from "./currencies.resolver";

@Module({
  imports: [DatabaseModule, AuthModule],
  providers: [
    CurrenciesService,
    CurrencyLedgerService,
    CurrenciesResolver,
    CurrencyTransactionFieldsResolver,
    CurrencyBalanceFieldsResolver,
  ],
  // CurrencyLedgerService is exported for the shop that will spend against it.
  exports: [CurrenciesService, CurrencyLedgerService],
})
export class CurrenciesModule {}
