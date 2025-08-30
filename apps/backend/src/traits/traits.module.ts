import { Module } from '@nestjs/common';
import { TraitsService } from './traits.service';
import { TraitsResolver } from './traits.resolver';
import { DatabaseModule } from '../database/database.module';
import { SpeciesModule } from '../species/species.module';

@Module({
  imports: [DatabaseModule, SpeciesModule],
  providers: [TraitsResolver, TraitsService],
  exports: [TraitsService],
})
export class TraitsModule {}