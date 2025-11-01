import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CommunitiesModule } from '../communities/communities.module';
import { UsersModule } from '../users/users.module';
import { CommunityColorsModule } from '../community-colors/community-colors.module';
import { PendingOwnershipModule } from '../pending-ownership/pending-ownership.module';
import { ItemsService } from './items.service';
import { ItemsResolver } from './items.resolver';

@Module({
  imports: [DatabaseModule, CommunitiesModule, forwardRef(() => UsersModule), CommunityColorsModule, PendingOwnershipModule],
  providers: [ItemsService, ItemsResolver],
  exports: [ItemsService],
})
export class ItemsModule {}
