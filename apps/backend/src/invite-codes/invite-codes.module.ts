import { Module } from '@nestjs/common';
import { InviteCodesService } from './invite-codes.service';
import { InviteCodesResolver } from './invite-codes.resolver';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [DatabaseModule, UsersModule, RolesModule],
  providers: [InviteCodesResolver, InviteCodesService],
  exports: [InviteCodesService],
})
export class InviteCodesModule {}
