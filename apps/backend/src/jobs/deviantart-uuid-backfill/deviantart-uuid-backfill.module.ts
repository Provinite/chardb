import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { DeviantArtModule } from "../../deviantart/deviantart.module";
import { PendingOwnershipModule } from "../../pending-ownership/pending-ownership.module";
import { PubSubProvider } from "../../common/pubsub.provider";
import { DeviantartUuidBackfillService } from "./deviantart-uuid-backfill.service";
import { DeviantartUuidBackfillResolver } from "./deviantart-uuid-backfill.resolver";

@Module({
  imports: [DatabaseModule, DeviantArtModule, PendingOwnershipModule],
  providers: [
    DeviantartUuidBackfillService,
    DeviantartUuidBackfillResolver,
    PubSubProvider,
  ],
})
export class DeviantartUuidBackfillModule {}
