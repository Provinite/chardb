import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CommunitiesModule } from '../communities/communities.module';
import { UsersModule } from '../users/users.module';
import { CommunityColorsModule } from '../community-colors/community-colors.module';
import { ItemsService } from './items.service';
import { ItemsResolver } from './items.resolver';

@Module({
  imports: [DatabaseModule, CommunitiesModule, forwardRef(() => UsersModule), CommunityColorsModule],
  providers: [ItemsService, ItemsResolver],
  exports: [ItemsService],
})
export class ItemsModule {}
