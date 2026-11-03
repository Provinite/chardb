import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { ClockModule } from "../clock/clock.module";
import { EventsModule } from "../events/events.module";
import { AchievementsService } from "./achievements.service";
import { AchievementsResolver } from "./achievements.resolver";

@Module({
  imports: [DatabaseModule, ClockModule, EventsModule],
  providers: [AchievementsService, AchievementsResolver],
  exports: [AchievementsService],
})
export class AchievementsModule {}
