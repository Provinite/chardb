import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { PendingOwnershipService } from './pending-ownership.service';

@Module({
  imports: [DatabaseModule],
  providers: [PendingOwnershipService],
  exports: [PendingOwnershipService],
})
export class PendingOwnershipModule {}
