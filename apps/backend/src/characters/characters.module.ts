import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ImagesModule } from '../images/images.module';
import { TagsModule } from '../tags/tags.module';
import { UsersModule } from '../users/users.module';
import { MediaModule } from '../media/media.module';
import { SpeciesVariantsModule } from '../species-variants/species-variants.module';
import { SpeciesModule } from '../species/species.module';
import { TraitsModule } from '../traits/traits.module';
import { EnumValuesModule } from '../enum-values/enum-values.module';
import { PendingOwnershipModule } from '../pending-ownership/pending-ownership.module';
import { DiscordModule } from '../discord/discord.module';
import { CharactersService } from './characters.service';
import { CharactersResolver } from './characters.resolver';
import { CharacterTraitValueResolver } from './character-trait-value.resolver';

@Module({
  imports: [DatabaseModule, ImagesModule, TagsModule, UsersModule, forwardRef(() => MediaModule), SpeciesVariantsModule, SpeciesModule, TraitsModule, EnumValuesModule, PendingOwnershipModule, DiscordModule],
  providers: [CharactersService, CharactersResolver, CharacterTraitValueResolver],
  exports: [CharactersService],
})
export class CharactersModule {}