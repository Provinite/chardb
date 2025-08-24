import { Module } from '@nestjs/common';
import { CommunityInvitationsService } from './community-invitations.service';
import { CommunityInvitationsResolver } from './community-invitations.resolver';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [CommunityInvitationsResolver, CommunityInvitationsService],
  exports: [CommunityInvitationsService],
})
export class CommunityInvitationsModule {}