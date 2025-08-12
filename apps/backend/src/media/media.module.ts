import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaResolver } from './media.resolver';
import { DatabaseModule } from '../database/database.module';
import { TagsModule } from '../tags/tags.module';

@Module({
  imports: [DatabaseModule, TagsModule],
  providers: [MediaService, MediaResolver],
  exports: [MediaService],
})
export class MediaModule {}