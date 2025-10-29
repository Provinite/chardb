import { Module, forwardRef } from '@nestjs/common';
import { TraitsService } from './traits.service';
import { TraitsResolver } from './traits.resolver';
import { DatabaseModule } from '../database/database.module';
import { SpeciesModule } from '../species/species.module';
import { EnumValuesModule } from '../enum-values/enum-values.module';
import { CommunityColorsModule } from '../community-colors/community-colors.module';

@Module({
  imports: [DatabaseModule, forwardRef(() => SpeciesModule), EnumValuesModule, CommunityColorsModule],
  providers: [TraitsResolver, TraitsService],
  exports: [TraitsService],
})
export class TraitsModule {}