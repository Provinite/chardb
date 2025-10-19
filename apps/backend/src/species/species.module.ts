import { Module, forwardRef } from '@nestjs/common';
import { SpeciesService } from './species.service';
import { SpeciesResolver } from './species.resolver';
import { DatabaseModule } from '../database/database.module';
import { CommunitiesModule } from '../communities/communities.module';
import { TraitsModule } from '../traits/traits.module';

@Module({
  imports: [DatabaseModule, CommunitiesModule, forwardRef(() => TraitsModule)],
  providers: [SpeciesResolver, SpeciesService],
  exports: [SpeciesService],
})
export class SpeciesModule {}
