import { Module } from '@nestjs/common';
import { CommunityMembersService } from './community-members.service';
import { CommunityMembersResolver } from './community-members.resolver';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [CommunityMembersResolver, CommunityMembersService],
  exports: [CommunityMembersService],
})
export class CommunityMembersModule {}