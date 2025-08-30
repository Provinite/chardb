import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ImagesModule } from '../images/images.module';
import { TagsModule } from '../tags/tags.module';
import { UsersModule } from '../users/users.module';
import { MediaModule } from '../media/media.module';
import { SpeciesVariantsModule } from '../species-variants/species-variants.module';
import { SpeciesModule } from '../species/species.module';
import { CharactersService } from './characters.service';
import { CharactersResolver } from './characters.resolver';

@Module({
  imports: [DatabaseModule, ImagesModule, TagsModule, UsersModule, forwardRef(() => MediaModule), SpeciesVariantsModule, SpeciesModule],
  providers: [CharactersService, CharactersResolver],
  exports: [CharactersService],
})
export class CharactersModule {}