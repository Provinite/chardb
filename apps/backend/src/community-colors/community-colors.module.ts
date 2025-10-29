import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CommunitiesModule } from '../communities/communities.module';
import { CommunityColorsService } from './community-colors.service';
import { CommunityColorsResolver } from './community-colors.resolver';

@Module({
  imports: [DatabaseModule, CommunitiesModule],
  providers: [CommunityColorsService, CommunityColorsResolver],
  exports: [CommunityColorsService],
})
export class CommunityColorsModule {}
