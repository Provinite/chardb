import { Module } from "@nestjs/common";
import { CommunitiesService } from "./communities.service";
import { CommunitiesResolver } from "./communities.resolver";
import { DatabaseModule } from "../database/database.module";
import { CommunityMembershipModule } from "../community-membership/community-membership.module";
import { DiscordModule } from "../discord/discord.module";

@Module({
  imports: [DatabaseModule, DiscordModule, CommunityMembershipModule],
  providers: [CommunitiesResolver, CommunitiesService],
  exports: [CommunitiesService],
})
export class CommunitiesModule {}
