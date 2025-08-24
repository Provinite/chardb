import { Module } from '@nestjs/common';
import { InviteCodesService } from './invite-codes.service';
import { InviteCodesResolver } from './invite-codes.resolver';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [InviteCodesResolver, InviteCodesService],
  exports: [InviteCodesService],
})
export class InviteCodesModule {}