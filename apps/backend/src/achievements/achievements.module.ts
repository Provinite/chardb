import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { ClockModule } from "../clock/clock.module";
import { EventsModule } from "../events/events.module";
import { AchievementsService } from "./achievements.service";
import { AchievementsResolver } from "./achievements.resolver";
import { AchievementGrants } from "./achievement-grants";
import { HalloweenPlayAchievements } from "./halloween-play-achievements.service";
import { InfectiousEnthusiasm } from "./infectious-enthusiasm.service";

@Module({
  imports: [DatabaseModule, ClockModule, EventsModule],
  providers: [
    AchievementsService,
    AchievementsResolver,
    AchievementGrants,
    HalloweenPlayAchievements,
    InfectiousEnthusiasm,
  ],
  exports: [AchievementsService],
})
export class AchievementsModule {}
