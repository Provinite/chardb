import { Module, forwardRef } from '@nestjs/common';
import { SpeciesVariantsService } from './species-variants.service';
import { SpeciesVariantsResolver } from './species-variants.resolver';
import { DatabaseModule } from '../database/database.module';
import { SpeciesModule } from '../species/species.module';
import { EnumValueSettingsModule } from '../enum-value-settings/enum-value-settings.module';
import { CommunityColorsModule } from '../community-colors/community-colors.module';

@Module({
  imports: [DatabaseModule, SpeciesModule, forwardRef(() => EnumValueSettingsModule), CommunityColorsModule],
  providers: [SpeciesVariantsResolver, SpeciesVariantsService],
  exports: [SpeciesVariantsService],
})
export class SpeciesVariantsModule {}