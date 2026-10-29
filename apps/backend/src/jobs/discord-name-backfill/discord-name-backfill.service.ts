import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  Optional,
} from "@nestjs/common";
import { ExternalAccountProvider } from "@chardb/database";
import { DatabaseService } from "../../database/database.service";
import { DiscordService } from "../../discord/discord.service";
import { PendingOwnershipService } from "../../pending-ownership/pending-ownership.service";
import { DiscordNameBackfillStatus } from "./discord-name-backfill-status.entity";

/** Delay between Discord lookups. Overridable so tests need not wait. */
export const DISCORD_NAME_BACKFILL_PACE_MS = "DISCORD_NAME_BACKFILL_PACE_MS";

/**
 * Well under Discord's global limit of 50 requests a second, leaving the bot
 * room for the Halloween commands it is answering at the same time.
 */
const DEFAULT_PACE_MS = 250;

/**
 * Fills in the Discord username and display name of every unclaimed Discord
 * pending owner, by asking Discord about each account id once.
 *
 * Pending owners recorded before names were kept -- last year's event winners
 * -- have only a numeric id, which nobody can search for (#445). Grants record
 * names now; this catches up the rest, and can be rerun to refresh names
 * people have since changed.
 *
 * Runs in the background: at a few hundred accounts it outlasts a request.
 * One run at a time, per process.
 */
@Injectable()
export class DiscordNameBackfillService {
  private readonly logger = new Logger(DiscordNameBackfillService.name);
  private readonly paceMs: number;
  private current: DiscordNameBackfillStatus = {
    running: false,
    total: 0,
    processed: 0,
    updated: 0,
    failed: 0,
  };

  constructor(
    private readonly db: DatabaseService,
    private readonly discord: DiscordService,
    private readonly pendingOwnership: PendingOwnershipService,
    @Optional() @Inject(DISCORD_NAME_BACKFILL_PACE_MS) paceMs?: number,
  ) {
    this.paceMs = paceMs ?? DEFAULT_PACE_MS;
  }

  status(): DiscordNameBackfillStatus {
    return { ...this.current };
  }

  /** @returns The final status, once every account has been asked about. */
  async run(): Promise<DiscordNameBackfillStatus> {
    if (this.current.running) {
      throw new ConflictException("A Discord name backfill is already running");
    }
    // Claimed before the first await, so a second call cannot slip in.
    this.current = {
      running: true,
      total: 0,
      processed: 0,
      updated: 0,
      failed: 0,
      startedAt: new Date(),
    };

    try {
      const accounts = await this.db.pendingOwnership.findMany({
        where: { provider: ExternalAccountProvider.DISCORD, claimedAt: null },
        distinct: ["providerAccountId"],
        select: { providerAccountId: true },
      });
      this.current.total = accounts.length;
      this.logger.log({
        message: "Discord name backfill started",
        accounts: accounts.length,
      });

      for (const { providerAccountId } of accounts) {
        await this.backfillAccount(providerAccountId);
        this.current.processed++;
        await this.pause();
      }
    } finally {
      this.current.running = false;
      this.current.finishedAt = new Date();
      this.logger.log({
        message: "Discord name backfill finished",
        processed: this.current.processed,
        updated: this.current.updated,
        failed: this.current.failed,
      });
    }

    return this.status();
  }

  private async backfillAccount(providerAccountId: string): Promise<void> {
    try {
      const user = await this.discord.getUserInfo(providerAccountId);
      await this.pendingOwnership.recordNames(
        ExternalAccountProvider.DISCORD,
        providerAccountId,
        { displayIdentifier: user.username, displayName: user.displayName },
      );
      this.current.updated++;
    } catch (error) {
      // Deleted accounts and bad ids. Whatever name the rows already have is
      // left alone: a stale name beats none.
      this.current.failed++;
      this.logger.warn({
        message: "Discord name backfill could not look up an account",
        providerAccountId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private pause(): Promise<void> {
    if (this.paceMs <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, this.paceMs));
  }
}
