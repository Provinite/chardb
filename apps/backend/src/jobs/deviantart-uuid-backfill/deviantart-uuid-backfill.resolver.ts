import { Resolver, Mutation, Subscription, Args } from "@nestjs/graphql";
import { UseGuards, Inject, ConflictException } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { PubSub } from "graphql-subscriptions";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { AllowGlobalAdmin } from "../../auth/decorators/AllowGlobalAdmin";
import { PUB_SUB } from "../../common/pubsub.provider";
import { DeviantartUuidBackfillService } from "./deviantart-uuid-backfill.service";
import { DeviantartUuidBackfillProgress } from "./dto/deviantart-uuid-backfill-progress.entity";

@Resolver()
export class DeviantartUuidBackfillResolver {
  constructor(
    private backfillService: DeviantartUuidBackfillService,
    @Inject(PUB_SUB) private pubSub: PubSub,
  ) {}

  @Mutation(() => String, {
    description:
      "Start a DeviantArt UUID backfill job. Returns a job ID to pass to the subscription.",
  })
  @AllowGlobalAdmin()
  @UseGuards(JwtAuthGuard)
  async runDeviantartUuidBackfill(): Promise<string> {
    if (this.backfillService.isRunning) {
      throw new ConflictException(
        "A DeviantArt UUID backfill job is already running",
      );
    }

    const jobId = uuidv4();

    // Fire-and-forget — don't await
    this.backfillService.run(jobId).catch(() => {
      // Errors are logged inside the service; nothing to do here
    });

    return jobId;
  }

  @Subscription(() => DeviantartUuidBackfillProgress, {
    filter: (
      payload: {
        deviantartUuidBackfillProgress: DeviantartUuidBackfillProgress;
      },
      variables: { jobId: string },
    ) => payload.deviantartUuidBackfillProgress.jobId === variables.jobId,
  })
  deviantartUuidBackfillProgress(
    @Args("jobId") _jobId: string,
  ): AsyncIterableIterator<{
    deviantartUuidBackfillProgress: DeviantartUuidBackfillProgress;
  }> {
    return this.pubSub.asyncIterableIterator(
      "DEVIANTART_UUID_BACKFILL_PROGRESS",
    );
  }
}
