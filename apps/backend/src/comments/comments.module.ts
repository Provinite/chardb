import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CommentsResolver } from './comments.resolver';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';
import { CharactersModule } from '../characters/characters.module';
import { ImagesModule } from '../images/images.module';
import { GalleriesModule } from '../galleries/galleries.module';

@Module({
  imports: [
    DatabaseModule,
    UsersModule,
    CharactersModule,
    ImagesModule,
    GalleriesModule,
  ],
  providers: [CommentsService, CommentsResolver],
  exports: [CommentsService],
})
export class CommentsModule {}
