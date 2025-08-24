import { Module } from '@nestjs/common';
import { SpeciesService } from './species.service';
import { SpeciesResolver } from './species.resolver';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [SpeciesResolver, SpeciesService],
  exports: [SpeciesService],
})
export class SpeciesModule {}