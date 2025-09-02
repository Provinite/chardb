import { Module, forwardRef } from '@nestjs/common';
import { EnumValueSettingsService } from './enum-value-settings.service';
import { EnumValueSettingsResolver } from './enum-value-settings.resolver';
import { DatabaseModule } from '../database/database.module';
import { EnumValuesModule } from '../enum-values/enum-values.module';
import { SpeciesVariantsModule } from '../species-variants/species-variants.module';

@Module({
  imports: [DatabaseModule, EnumValuesModule, forwardRef(() => SpeciesVariantsModule)],
  providers: [EnumValueSettingsResolver, EnumValueSettingsService],
  exports: [EnumValueSettingsService],
})
export class EnumValueSettingsModule {}