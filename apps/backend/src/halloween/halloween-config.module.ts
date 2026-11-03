import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HalloweenConfig } from "./halloween.config";

/**
 * The Halloween bot's credentials, on their own so a module that needs the
 * bot's identity can have it without the rest of Halloween.
 */
@Module({
  imports: [ConfigModule],
  providers: [HalloweenConfig],
  exports: [HalloweenConfig],
})
export class HalloweenConfigModule {}
