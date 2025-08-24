import { Module } from '@nestjs/common';
import { TraitListEntriesService } from './trait-list-entries.service';
import { TraitListEntriesResolver } from './trait-list-entries.resolver';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [TraitListEntriesResolver, TraitListEntriesService],
  exports: [TraitListEntriesService],
})
export class TraitListEntriesModule {}