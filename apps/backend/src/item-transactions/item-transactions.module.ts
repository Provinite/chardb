import { Module, forwardRef } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { DataLoadersModule } from "../dataloaders/dataloaders.module";
import { ItemTransactionsService } from "./item-transactions.service";
import {
  ItemTransactionConnectionResolver,
  ItemTransactionsResolver,
} from "./item-transactions.resolver";

@Module({
  imports: [DatabaseModule, DataLoadersModule, forwardRef(() => AuthModule)],
  providers: [
    ItemTransactionsService,
    ItemTransactionsResolver,
    ItemTransactionConnectionResolver,
  ],
  exports: [ItemTransactionsService],
})
export class ItemTransactionsModule {}
