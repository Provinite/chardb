import { Module } from '@nestjs/common';
import { TraitListEntriesService } from './trait-list-entries.service';
import { TraitListEntriesResolver } from './trait-list-entries.resolver';
import { DatabaseModule } from '../database/database.module';
import { TraitsModule } from '../traits/traits.module';
import { SpeciesVariantsModule } from '../species-variants/species-variants.module';

@Module({
  imports: [DatabaseModule, TraitsModule, SpeciesVariantsModule],
  providers: [TraitListEntriesResolver, TraitListEntriesService],
  exports: [TraitListEntriesService],
})
export class TraitListEntriesModule {}
