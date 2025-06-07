import { Module } from '@nestjs/common';
import { GalleriesService } from './galleries.service';
import { GalleriesResolver } from './galleries.resolver';

@Module({
  providers: [GalleriesService, GalleriesResolver],
  exports: [GalleriesService],
})
export class GalleriesModule {}