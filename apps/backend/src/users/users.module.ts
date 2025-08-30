import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersResolver, UserProfileResolver, UserStatsResolver } from './users.resolver';

@Module({
  providers: [UsersService, UsersResolver, UserProfileResolver, UserStatsResolver],
  exports: [UsersService],
})
export class UsersModule {}