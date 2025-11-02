import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { PendingOwnershipService } from './pending-ownership.service';
import { PendingOwnershipResolver } from './pending-ownership.resolver';
import { ExternalAccountsModule } from '../external-accounts/external-accounts.module';

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => AuthModule),
    forwardRef(() => ExternalAccountsModule),
  ],
  providers: [PendingOwnershipService, PendingOwnershipResolver],
  exports: [PendingOwnershipService],
})
export class PendingOwnershipModule {}
