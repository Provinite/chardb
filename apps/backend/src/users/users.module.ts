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
// references it.
//
// `forwardRef` because this is a cycle, though not an obvious one:
// `ImagesModule` does not import this module, it imports `AuthModule`, which
// reaches back here. Nothing catches that except booting the whole graph --
// the unit tests and the module-scoped e2e specs build partial graphs and
// resolve happily.
import { ImagesModule } from "../images/images.module";

@Module({
  imports: [
    SocialModule,
    ExternalAccountsModule,
    forwardRef(() => ImagesModule),
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
