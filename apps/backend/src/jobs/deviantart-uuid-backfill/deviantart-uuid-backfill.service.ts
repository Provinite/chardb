import { Injectable, Logger, ConflictException, Inject } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import { DeviantArtService } from "../../deviantart/deviantart.service";
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

const RATE_LIMIT_DELAY_MS = 2000;

const PROGRESS_TOPIC = "DEVIANTART_UUID_BACKFILL_PROGRESS";

@Injectable()
export class DeviantartUuidBackfillService {
  private readonly logger = new Logger(DeviantartUuidBackfillService.name);
  private running = false;

  constructor(
    private readonly db: DatabaseService,
    private readonly deviantArtService: DeviantArtService,
    private readonly pendingOwnershipService: PendingOwnershipService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  get isRunning(): boolean {
    return this.running;
  }

  async run(jobId: string): Promise<void> {
    if (this.running) {
      throw new ConflictException(
        "A DeviantArt UUID backfill job is already running",
      );
    }

    this.running = true;

    try {
      await this.executeBackfill(jobId);
    } finally {
      this.running = false;
    }
  }

  private async executeBackfill(jobId: string): Promise<void> {
    // Find all unclaimed DA pending_ownership records with username-style IDs
    const candidates = await this.db.pendingOwnership.findMany({
      where: {
        provider: ExternalAccountProvider.DEVIANTART,
        claimedAt: null,
      },
    });

    // Filter to only records that don't already have a UUID
    const records = candidates.filter(
      (r) => !UUID_REGEX.test(r.providerAccountId),
    );

    this.logger.log(
      `Backfill job ${jobId}: Found ${records.length} candidate records (of ${candidates.length} total unclaimed DA records)`,
    );

    const progress: DeviantartUuidBackfillProgress = {
      jobId,
      total: records.length,
      processed: 0,
      succeeded: 0,
      failed: 0,
      claimed: 0,
      done: false,
    };

    // Publish initial progress
    await this.publishProgress(progress);

    for (const record of records) {
      const recordResult: DeviantartUuidBackfillRecordResult = {
        pendingOwnershipId: record.id,
        characterId: record.characterId ?? undefined,
        itemId: record.itemId ?? undefined,
        oldValue: record.providerAccountId,
        success: false,
        claimed: false,
      };

      try {
        // Rate limit: wait before each API call
        await this.delay(RATE_LIMIT_DELAY_MS);

        // Resolve username to UUID
        const uuid = await this.deviantArtService.resolveUsernameToUuid(
          record.providerAccountId,
        );

        recordResult.newValue = uuid;

        // Transactionally update the record and attempt auto-claim
        const claimResult = await this.db.$transaction(
          async (tx: Prisma.TransactionClient) => {
            return this.pendingOwnershipService.updateProviderIdAndClaim(
              tx,
              record.id,
              uuid,
              ExternalAccountProvider.DEVIANTART,
              {
                characterId: record.characterId ?? undefined,
                itemId: record.itemId ?? undefined,
              },
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
          `Backfill job ${jobId}: Resolved "${record.providerAccountId}" → ${uuid}${claimResult.claimed ? " (auto-claimed)" : ""}`,
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        recordResult.error = errorMessage;
        progress.failed++;

        this.logger.warn(
          `Backfill job ${jobId}: Failed to resolve "${record.providerAccountId}": ${errorMessage}`,
        );
      }

      progress.processed++;
      progress.currentRecord = recordResult;
      await this.publishProgress(progress);
    }

    // Publish completion
    progress.done = true;
    progress.currentRecord = undefined;
    await this.publishProgress(progress);

    this.logger.log(
      `Backfill job ${jobId}: Complete. ${progress.succeeded} succeeded, ${progress.failed} failed, ${progress.claimed} auto-claimed.`,
    );
  }

  private async publishProgress(
    progress: DeviantartUuidBackfillProgress,
  ): Promise<void> {
    await this.pubSub.publish(PROGRESS_TOPIC, {
      deviantartUuidBackfillProgress: progress,
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
