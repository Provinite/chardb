import { Module, forwardRef } from "@nestjs/common";
import { UsersService } from "./users.service";
import {
  UsersResolver,
  UserProfileResolver,
  UserStatsResolver,
} from "./users.resolver";
import { SocialModule } from "../social/social.module";
import { ExternalAccountsModule } from "../external-accounts/external-accounts.module";
import { ItemsModule } from "../items/items.module";
import { CommunityMembersModule } from "../community-members/community-members.module";
// For sweeping up an avatar's image when it is displaced and nothing else
// references it. `ImagesModule` does not import this one, so no cycle.
import { ImagesModule } from "../images/images.module";

@Module({
  imports: [
    SocialModule,
    ExternalAccountsModule,
    ImagesModule,
    forwardRef(() => ItemsModule),
    forwardRef(() => CommunityMembersModule),
  ],
  providers: [
    UsersService,
    UsersResolver,
    UserProfileResolver,
    UserStatsResolver,
  ],
  exports: [UsersService],
})
export class UsersModule {}
