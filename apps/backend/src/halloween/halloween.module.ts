import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { ItemsModule } from "../items/items.module";
import { PendingOwnershipModule } from "../pending-ownership/pending-ownership.module";
import { HalloweenConfig } from "./halloween.config";
import { ClockModule } from "../clock/clock.module";
import { HalloweenRandom } from "./random";
import { HalloweenUi } from "./discord/ui";
import { HalloweenDiscordClient } from "./discord/halloween-discord.client";
import { HalloweenCommandDispatcher } from "./discord/halloween-command.dispatcher";
import { HalloweenInteractionsController } from "./discord/halloween-interactions.controller";
import {
  HALLOWEEN_COMMANDS,
  type HalloweenCommandHandler,
} from "./discord/halloween-command";
import { GuildSettingsService } from "./services/guild-settings.service";
import { PrizeService } from "./services/prize.service";
import { KnockEventService } from "./services/knock-event.service";
import { GiftyService } from "./services/gifty.service";
import { DeviantArtUserService } from "./services/deviantart-user.service";
import { PrizeAwardService } from "./services/prize-award.service";
import { PlayerLock } from "./services/player-lock";
import { PrizeImageService } from "./services/prize-image.service";
import { HalloweenLinks } from "./halloween-links";
import { HalloweenDashboardService } from "./dashboard/halloween-dashboard.service";
import { HalloweenDashboardResolver } from "./dashboard/halloween-dashboard.resolver";
import { HalloweenAdminService } from "./dashboard/halloween-admin.service";
import { HalloweenAdminResolver } from "./dashboard/halloween-admin.resolver";
import { CandyBoardService } from "./board/candy-board.service";
import { CandyBoardResolver } from "./board/candy-board.resolver";
import { CandySwapService } from "./swap/candy-swap.service";
import { CandySwapResolver } from "./swap/candy-swap.resolver";
import { NotificationsModule } from "../notifications/notifications.module";
import { KnockCommand } from "./commands/knock.command";
import { AdminKnockCommand } from "./commands/adminknock.command";
import { GiftyCommand } from "./commands/gifty.command";
import { PrizeCommand } from "./commands/prize.command";
import { SettingsCommand } from "./commands/settings.command";
import { InfoCommand } from "./commands/info.command";
import { HelpCommand } from "./commands/help.command";
import { CreditsCommand } from "./commands/credits.command";
import { DeviantArtCommand } from "./commands/deviantart.command";
import { TestWinCommand } from "./commands/testwin.command";

const COMMANDS = [
  KnockCommand,
  AdminKnockCommand,
  GiftyCommand,
  PrizeCommand,
  SettingsCommand,
  InfoCommand,
  HelpCommand,
  CreditsCommand,
  DeviantArtCommand,
  TestWinCommand,
];

/**
 * The Cloverse Halloween trick-or-treat event, formerly a standalone Discord
 * bot. Discord delivers its slash commands to
 * `POST /discord/halloween/interactions`.
 */
@Module({
  imports: [
    ConfigModule,
    ClockModule,
    DatabaseModule,
    AuthModule,
    ItemsModule,
    PendingOwnershipModule,
    NotificationsModule,
  ],
  controllers: [HalloweenInteractionsController],
  providers: [
    HalloweenConfig,
    HalloweenRandom,
    HalloweenUi,
    HalloweenDiscordClient,
    HalloweenCommandDispatcher,
    GuildSettingsService,
    PrizeService,
    KnockEventService,
    GiftyService,
    DeviantArtUserService,
    PrizeAwardService,
    PlayerLock,
    PrizeImageService,
    HalloweenLinks,
    HalloweenDashboardService,
    HalloweenDashboardResolver,
    HalloweenAdminService,
    HalloweenAdminResolver,
    CandyBoardService,
    CandyBoardResolver,
    CandySwapService,
    CandySwapResolver,
    ...COMMANDS,
    {
      provide: HALLOWEEN_COMMANDS,
      useFactory: (...commands: HalloweenCommandHandler[]) => commands,
      inject: COMMANDS,
    },
  ],
})
export class HalloweenModule {}
