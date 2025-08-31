import { Module } from '@nestjs/common';
import { SpeciesVariantsService } from './species-variants.service';
import { SpeciesVariantsResolver } from './species-variants.resolver';
import { DatabaseModule } from '../database/database.module';
import { SpeciesModule } from '../species/species.module';

@Module({
  imports: [DatabaseModule, SpeciesModule],
  providers: [SpeciesVariantsResolver, SpeciesVariantsService],
  exports: [SpeciesVariantsService],
})
export class SpeciesVariantsModule {}