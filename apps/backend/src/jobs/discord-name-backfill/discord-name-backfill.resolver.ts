import { ConflictException, Logger } from "@nestjs/common";
import { Mutation, Query, Resolver } from "@nestjs/graphql";
import { AllowGlobalAdmin } from "../../auth/decorators/AllowGlobalAdmin";
import { DiscordNameBackfillService } from "./discord-name-backfill.service";
import { DiscordNameBackfillStatus } from "./discord-name-backfill-status.entity";

@Resolver()
export class DiscordNameBackfillResolver {
  private readonly logger = new Logger(DiscordNameBackfillResolver.name);

  constructor(private readonly backfill: DiscordNameBackfillService) {}

  @AllowGlobalAdmin()
  @Mutation(() => DiscordNameBackfillStatus, {
    description:
      "Start looking up Discord names for unclaimed Discord pending owners. " +
      "Returns at once; poll discordNameBackfillStatus for progress.",
  })
  runDiscordNameBackfill(): DiscordNameBackfillStatus {
    // Checked here because run() is async: its own refusal would arrive as a
    // rejection nobody is waiting for, and the admin would hear nothing.
    if (this.backfill.status().running) {
      throw new ConflictException("A Discord name backfill is already running");
    }
    // Started, not awaited: it outlasts a request. run() marks itself running
    // before its first await, so the status returned below already says so.
    this.backfill.run().catch((error: unknown) => {
      this.logger.error({
        message: "Discord name backfill failed",
        error: error instanceof Error ? error.message : String(error),
      });
    });
    return this.backfill.status();
  }

  @AllowGlobalAdmin()
  @Query(() => DiscordNameBackfillStatus, {
    description: "Progress of the most recent Discord name backfill.",
  })
  discordNameBackfillStatus(): DiscordNameBackfillStatus {
    return this.backfill.status();
  }
}
