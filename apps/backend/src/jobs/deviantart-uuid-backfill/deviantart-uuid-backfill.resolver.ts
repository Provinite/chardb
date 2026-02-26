import { Resolver, Mutation, Subscription, Args } from "@nestjs/graphql";
import { Inject, ConflictException } from "@nestjs/common";
import { PubSub } from "graphql-subscriptions";
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

  @Mutation(() => Boolean, {
    description:
      "Start a DeviantArt UUID backfill job. Client provides the jobId (subscribe first, then call this).",
  })
  @AllowGlobalAdmin()
  async runDeviantartUuidBackfill(
    @Args("jobId") jobId: string,
  ): Promise<boolean> {
    if (this.backfillService.isRunning) {
      throw new ConflictException(
        "A DeviantArt UUID backfill job is already running",
      );
    }

    // Fire-and-forget — don't await
    this.backfillService.run(jobId).catch(() => {
      // Errors are logged inside the service; nothing to do here
    });

    return true;
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
