import { Injectable, Logger, ConflictException, Inject } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import {
  DeviantArtService,
  type ResolvedDeviantArtUser,
} from "../../deviantart/deviantart.service";
import { PendingOwnershipService } from "../../pending-ownership/pending-ownership.service";
import { PubSub } from "graphql-subscriptions";
import { PUB_SUB } from "../../common/pubsub.provider";
import { ExternalAccountProvider, Prisma } from "@chardb/database";
import {
  DeviantartUuidBackfillProgress,
  DeviantartUuidBackfillRecordResult,
} from "./dto/deviantart-uuid-backfill-progress.entity";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const RATE_LIMIT_DELAY_MS = 1000;
const RATE_LIMIT_JITTER_MS = 150;

const PROGRESS_TOPIC = "DEVIANTART_UUID_BACKFILL_PROGRESS";

@Injectable()
export class DeviantartUuidBackfillService {
  private readonly logger = new Logger(DeviantartUuidBackfillService.name);
  private running = false;
  private cancelled = false;

  constructor(
    private readonly db: DatabaseService,
    private readonly deviantArtService: DeviantArtService,
    private readonly pendingOwnershipService: PendingOwnershipService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  get isRunning(): boolean {
    return this.running;
  }

  cancel(): void {
    if (!this.running) return;
    this.cancelled = true;
    this.logger.log("[DeviantArtBackFill] Cancellation requested");
  }

  async run(jobId: string): Promise<void> {
    if (this.running) {
      throw new ConflictException(
        "A DeviantArt UUID backfill job is already running",
      );
    }

    this.running = true;
    this.cancelled = false;

    try {
      await this.executeBackfill(jobId);
    } finally {
      this.running = false;
      this.cancelled = false;
    }
  }

  private async executeBackfill(jobId: string): Promise<void> {
    await new Promise((res) => setTimeout(res, 1500));
    // Find all unclaimed DA pending_ownership records for characters
    const candidates = await this.db.pendingOwnership.findMany({
      where: {
        provider: ExternalAccountProvider.DEVIANTART,
        claimedAt: null,
        characterId: { not: null },
      },
    });

    // Filter to only records that don't already have a UUID
    const records = candidates.filter(
      (r) => !UUID_REGEX.test(r.providerAccountId),
    );

    this.logger.log(
      `[DeviantArtBackFill] job ${jobId}: Found ${records.length} candidate records (of ${candidates.length} total unclaimed DA records)`,
    );

    const progress: DeviantartUuidBackfillProgress = {
      jobId,
      total: records.length,
      processed: 0,
      succeeded: 0,
      failed: 0,
      claimed: 0,
      done: false,
      cancelled: false,
    };

    // Publish initial progress
    await this.publishProgress(progress);

    // Cache DA username → resolved user (or error) to avoid redundant API calls
    const resolvedCache = new Map<string, ResolvedDeviantArtUser | Error>();

    for (const record of records) {
      if (this.cancelled) {
        this.logger.log(
          `[DeviantArtBackFill] job ${jobId}: Cancelled after ${progress.processed} of ${progress.total} records`,
        );
        break;
      }

      const recordResult: DeviantartUuidBackfillRecordResult = {
        pendingOwnershipId: record.id,
        characterId: record.characterId ?? undefined,
        itemId: record.itemId ?? undefined,
        oldValue: record.providerAccountId,
        success: false,
        claimed: false,
      };

      try {
        const username = record.providerAccountId;
        let cached = resolvedCache.get(username);

        if (!cached) {
          // Rate limit only when making an actual API call
          const jitter =
            Math.floor(Math.random() * RATE_LIMIT_JITTER_MS * 2) -
            RATE_LIMIT_JITTER_MS;
          await this.delay(RATE_LIMIT_DELAY_MS + jitter);

          try {
            cached = await this.deviantArtService.resolveUsername(username);
          } catch (error) {
            cached = error instanceof Error ? error : new Error(String(error));
          }
          resolvedCache.set(username, cached);
        }

        if (cached instanceof Error) {
          throw cached;
        }

        recordResult.newValue = cached.uuid;

        // Transactionally update the record and attempt auto-claim
        const claimResult = await this.db.$transaction(
          async (tx: Prisma.TransactionClient) => {
            return this.pendingOwnershipService.updateProviderIdAndClaim(
              tx,
              record.id,
              cached.uuid,
              ExternalAccountProvider.DEVIANTART,
              {
                characterId: record.characterId ?? undefined,
                itemId: record.itemId ?? undefined,
              },
              cached.username,
            );
          },
        );

        recordResult.success = true;
        recordResult.claimed = claimResult.claimed;
        recordResult.claimedByUserId = claimResult.claimed
          ? claimResult.claimedByUserId
          : undefined;

        progress.succeeded++;
        if (claimResult.claimed) {
          progress.claimed++;
        }

        this.logger.log(
          `[DeviantArtBackFill] job ${jobId}: Resolved "${record.providerAccountId}" → ${cached.uuid}${claimResult.claimed ? " (auto-claimed)" : ""}`,
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        recordResult.error = errorMessage;
        progress.failed++;

        this.logger.warn(
          `[DeviantArtBackFill] job ${jobId}: Failed to resolve "${record.providerAccountId}": ${errorMessage}`,
        );
      }

      progress.processed++;
      progress.currentRecord = recordResult;
      await this.publishProgress(progress);
    }

    // Publish completion
    progress.done = true;
    progress.cancelled = this.cancelled;
    progress.currentRecord = undefined;
    await this.publishProgress(progress);

    const status = this.cancelled ? "Cancelled" : "Complete";
    this.logger.log(
      `[DeviantArtBackFill] job ${jobId}: ${status}. ${progress.succeeded} succeeded, ${progress.failed} failed, ${progress.claimed} auto-claimed.`,
    );
  }

  private async publishProgress(
    progress: DeviantartUuidBackfillProgress,
  ): Promise<void> {
    // Snapshot to prevent mutation aliasing — PubSub holds a reference
    await this.pubSub.publish(PROGRESS_TOPIC, {
      deviantartUuidBackfillProgress: { ...progress },
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
