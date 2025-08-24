import { Module } from '@nestjs/common';
import { SpeciesVariantsService } from './species-variants.service';
import { SpeciesVariantsResolver } from './species-variants.resolver';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [SpeciesVariantsResolver, SpeciesVariantsService],
  exports: [SpeciesVariantsService],
})
export class SpeciesVariantsModule {}