import { Module } from '@nestjs/common';
import { EnumValuesService } from './enum-values.service';
import { EnumValuesResolver } from './enum-values.resolver';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [EnumValuesResolver, EnumValuesService],
  exports: [EnumValuesService],
})
export class EnumValuesModule {}