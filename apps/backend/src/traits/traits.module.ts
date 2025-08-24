import { Module } from '@nestjs/common';
import { TraitsService } from './traits.service';
import { TraitsResolver } from './traits.resolver';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [TraitsResolver, TraitsService],
  exports: [TraitsService],
})
export class TraitsModule {}