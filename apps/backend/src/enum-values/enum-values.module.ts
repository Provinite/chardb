import { Module, forwardRef } from '@nestjs/common';
import { EnumValuesService } from './enum-values.service';
import { EnumValuesResolver } from './enum-values.resolver';
import { DatabaseModule } from '../database/database.module';
import { TraitsModule } from '../traits/traits.module';
import { CommunityColorsModule } from '../community-colors/community-colors.module';

@Module({
  imports: [DatabaseModule, forwardRef(() => TraitsModule), CommunityColorsModule],
  providers: [EnumValuesResolver, EnumValuesService],
  exports: [EnumValuesService],
})
export class EnumValuesModule {}