import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { HalloweenClock } from "../halloween/clock";
import { AchievementsService } from "./achievements.service";
import { AchievementsResolver } from "./achievements.resolver";

@Module({
  imports: [DatabaseModule],
  providers: [AchievementsService, AchievementsResolver, HalloweenClock],
  exports: [AchievementsService],
})
export class AchievementsModule {}
