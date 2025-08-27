import { Module } from '@nestjs/common';
import { EnumValueSettingsService } from './enum-value-settings.service';
import { EnumValueSettingsResolver } from './enum-value-settings.resolver';
import { DatabaseModule } from '../database/database.module';
import { EnumValuesModule } from '../enum-values/enum-values.module';

@Module({
  imports: [DatabaseModule, EnumValuesModule],
  providers: [EnumValueSettingsResolver, EnumValueSettingsService],
  exports: [EnumValueSettingsService],
})
export class EnumValueSettingsModule {}