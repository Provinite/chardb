import { Module } from '@nestjs/common';
import { CommunityInvitationsService } from './community-invitations.service';
import { CommunityInvitationsResolver } from './community-invitations.resolver';
import { DatabaseModule } from '../database/database.module';
import { RolesModule } from '../roles/roles.module';
import { UsersModule } from '../users/users.module';
import { CommunitiesModule } from '../communities/communities.module';

@Module({
  imports: [DatabaseModule, RolesModule, UsersModule, CommunitiesModule],
  providers: [CommunityInvitationsResolver, CommunityInvitationsService],
  exports: [CommunityInvitationsService],
})
export class CommunityInvitationsModule {}