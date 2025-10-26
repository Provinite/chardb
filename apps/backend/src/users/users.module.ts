import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersResolver, UserProfileResolver, UserStatsResolver } from './users.resolver';
import { SocialModule } from '../social/social.module';
import { ExternalAccountsModule } from '../external-accounts/external-accounts.module';
import { ItemsModule } from '../items/items.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    SocialModule,
    ExternalAccountsModule,
    forwardRef(() => ItemsModule),
  ],
  providers: [UsersService, UsersResolver, UserProfileResolver, UserStatsResolver],
  exports: [UsersService],
})
export class UsersModule {}