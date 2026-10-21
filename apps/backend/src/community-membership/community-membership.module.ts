import { Module, forwardRef } from "@nestjs/common";
import { PendingOwnershipModule } from "../pending-ownership/pending-ownership.module";
import { CommunityMembershipService } from "./community-membership.service";

@Module({
  imports: [forwardRef(() => PendingOwnershipModule)],
  providers: [CommunityMembershipService],
  exports: [CommunityMembershipService],
})
export class CommunityMembershipModule {}
