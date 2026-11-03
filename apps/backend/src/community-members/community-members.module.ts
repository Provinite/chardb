import { Module, forwardRef } from "@nestjs/common";
import { CommunityMembersService } from "./community-members.service";
import { CommunityMembersResolver } from "./community-members.resolver";
import { UserMembershipResolver } from "./user-membership.resolver";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { CommunityMembershipModule } from "../community-membership/community-membership.module";

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => AuthModule),
    forwardRef(() => CommunityMembershipModule),
  ],
  providers: [
    CommunityMembersResolver,
    UserMembershipResolver,
    CommunityMembersService,
  ],
  exports: [CommunityMembersService],
})
export class CommunityMembersModule {}
