import { Module } from '@nestjs/common';
import { EnumValueSettingsService } from './enum-value-settings.service';
import { EnumValueSettingsResolver } from './enum-value-settings.resolver';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [EnumValueSettingsResolver, EnumValueSettingsService],
  exports: [EnumValueSettingsService],
})
export class EnumValueSettingsModule {}