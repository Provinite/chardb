import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CommunitiesModule } from '../communities/communities.module';
import { UsersModule } from '../users/users.module';
import { CommunityColorsModule } from '../community-colors/community-colors.module';
import { PendingOwnershipModule } from '../pending-ownership/pending-ownership.module';
import { DiscordModule } from '../discord/discord.module';
import { ItemsService } from './items.service';
import { ItemsResolver, ItemFieldsResolver } from './items.resolver';

@Module({
  imports: [DatabaseModule, CommunitiesModule, forwardRef(() => UsersModule), CommunityColorsModule, PendingOwnershipModule, DiscordModule],
  providers: [ItemsService, ItemsResolver, ItemFieldsResolver],
  exports: [ItemsService],
})
export class ItemsModule {}
