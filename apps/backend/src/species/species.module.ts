import { Module } from '@nestjs/common';
import { SpeciesService } from './species.service';
import { SpeciesResolver } from './species.resolver';
import { DatabaseModule } from '../database/database.module';
import { CommunitiesModule } from '../communities/communities.module';

@Module({
  imports: [DatabaseModule, CommunitiesModule],
  providers: [SpeciesResolver, SpeciesService],
  exports: [SpeciesService],
})
export class SpeciesModule {}