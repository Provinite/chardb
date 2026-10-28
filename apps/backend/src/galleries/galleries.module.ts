import { Module, forwardRef } from "@nestjs/common";
import { GalleriesService } from "./galleries.service";
import { GalleriesResolver } from "./galleries.resolver";
import { DatabaseModule } from "../database/database.module";
import { DataLoadersModule } from "../dataloaders/dataloaders.module";
import { UsersModule } from "../users/users.module";
import { CharactersModule } from "../characters/characters.module";
import { MediaModule } from "../media/media.module";

@Module({
  imports: [
    DatabaseModule,
    DataLoadersModule,
    UsersModule,
    forwardRef(() => CharactersModule),
    forwardRef(() => MediaModule),
  ],
  providers: [GalleriesService, GalleriesResolver],
  exports: [GalleriesService],
})
export class GalleriesModule {}
