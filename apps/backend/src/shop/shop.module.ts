import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { CurrenciesModule } from "../currencies/currencies.module";
import { ItemsModule } from "../items/items.module";
import { ShopService } from "./shop.service";
import { ShopResolver } from "./shop.resolver";

@Module({
  imports: [DatabaseModule, AuthModule, CurrenciesModule, ItemsModule],
  providers: [ShopService, ShopResolver],
  exports: [ShopService],
})
export class ShopModule {}
