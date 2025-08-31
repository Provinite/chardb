import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersResolver, UserProfileResolver, UserStatsResolver } from './users.resolver';
import { SocialModule } from '../social/social.module';

@Module({
  imports: [SocialModule],
  providers: [UsersService, UsersResolver, UserProfileResolver, UserStatsResolver],
  exports: [UsersService],
})
export class UsersModule {}