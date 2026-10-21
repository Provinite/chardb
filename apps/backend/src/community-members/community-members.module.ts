import { Module, forwardRef } from "@nestjs/common";
import { CommunityMembersService } from "./community-members.service";
import { CommunityMembersResolver } from "./community-members.resolver";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { CommunityMembershipModule } from "../community-membership/community-membership.module";

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => AuthModule),
    forwardRef(() => CommunityMembershipModule),
  ],
  providers: [CommunityMembersResolver, CommunityMembersService],
  exports: [CommunityMembersService],
})
export class CommunityMembersModule {}
