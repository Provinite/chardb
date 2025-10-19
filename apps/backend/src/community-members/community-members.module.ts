import { Module, forwardRef } from '@nestjs/common';
import { CommunityMembersService } from './community-members.service';
import { CommunityMembersResolver } from './community-members.resolver';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, forwardRef(() => AuthModule)],
  providers: [CommunityMembersResolver, CommunityMembersService],
  exports: [CommunityMembersService],
})
export class CommunityMembersModule {}
