import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ImagesService } from './images.service';
import { ImagesResolver } from './images.resolver';
import { ImagesController } from './images.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [ImagesController],
  providers: [ImagesService, ImagesResolver],
  exports: [ImagesService],
})
export class ImagesModule {}