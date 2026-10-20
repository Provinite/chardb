import { Module, forwardRef } from "@nestjs/common";
import { InviteCodesService } from "./invite-codes.service";
import { InviteCodesResolver } from "./invite-codes.resolver";
import { DatabaseModule } from "../database/database.module";
import { UsersModule } from "../users/users.module";
import { RolesModule } from "../roles/roles.module";
import { CommunityMembershipModule } from "../community-membership/community-membership.module";

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => UsersModule),
    RolesModule,
    CommunityMembershipModule,
  ],
  providers: [InviteCodesResolver, InviteCodesService],
  exports: [InviteCodesService],
})
export class InviteCodesModule {}
