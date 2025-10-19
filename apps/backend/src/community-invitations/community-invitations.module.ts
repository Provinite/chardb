import { Module, forwardRef } from '@nestjs/common';
import { CommunityInvitationsService } from './community-invitations.service';
import { CommunityInvitationsResolver } from './community-invitations.resolver';
import { DatabaseModule } from '../database/database.module';
import { RolesModule } from '../roles/roles.module';
import { UsersModule } from '../users/users.module';
import { CommunitiesModule } from '../communities/communities.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    DatabaseModule,
    RolesModule,
    UsersModule,
    CommunitiesModule,
    forwardRef(() => AuthModule),
  ],
  providers: [CommunityInvitationsResolver, CommunityInvitationsService],
  exports: [CommunityInvitationsService],
})
export class CommunityInvitationsModule {}
