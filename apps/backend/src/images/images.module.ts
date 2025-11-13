import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { TagsModule } from '../tags/tags.module';
import { AuthModule } from '../auth/auth.module';
import { ImagesService } from './images.service';
import { ImagesResolver } from './images.resolver';
import { ImagesController } from './images.controller';
import { S3Service } from './s3.service';

@Module({
  imports: [DatabaseModule, TagsModule, AuthModule],
  controllers: [ImagesController],
  providers: [ImagesService, ImagesResolver, S3Service],
  exports: [ImagesService, S3Service],
})
export class ImagesModule {}