import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaResolver } from './media.resolver';
import { DatabaseModule } from '../database/database.module';
import { TagsModule } from '../tags/tags.module';
import { UsersModule } from '../users/users.module';
import { CharactersModule } from '../characters/characters.module';
import { GalleriesModule } from '../galleries/galleries.module';
import { ImagesModule } from '../images/images.module';

@Module({
  imports: [
    DatabaseModule, 
    TagsModule, 
    UsersModule, 
    CharactersModule, 
    GalleriesModule, 
    ImagesModule
  ],
  providers: [MediaService, MediaResolver],
  exports: [MediaService],
})
export class MediaModule {}