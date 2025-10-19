import { Module } from '@nestjs/common';
import { CommunitiesService } from './communities.service';
import { CommunitiesResolver } from './communities.resolver';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [CommunitiesResolver, CommunitiesService],
  exports: [CommunitiesService],
})
export class CommunitiesModule {}
