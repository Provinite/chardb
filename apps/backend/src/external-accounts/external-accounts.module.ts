import { Module } from '@nestjs/common';
import { ExternalAccountsService } from './external-accounts.service';
import { ExternalAccountsResolver } from './external-accounts.resolver';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [ExternalAccountsService, ExternalAccountsResolver],
  exports: [ExternalAccountsService],
})
export class ExternalAccountsModule {}
