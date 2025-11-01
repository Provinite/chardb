import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { PendingOwnershipService } from './pending-ownership.service';
import { PendingOwnershipResolver } from './pending-ownership.resolver';

@Module({
  imports: [DatabaseModule, forwardRef(() => AuthModule)],
  providers: [PendingOwnershipService, PendingOwnershipResolver],
  exports: [PendingOwnershipService],
})
export class PendingOwnershipModule {}
