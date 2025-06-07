import { Module } from '@nestjs/common';
import { GalleriesService } from './galleries.service';
import { GalleriesResolver } from './galleries.resolver';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [GalleriesService, GalleriesResolver],
  exports: [GalleriesService],
})
export class GalleriesModule {}