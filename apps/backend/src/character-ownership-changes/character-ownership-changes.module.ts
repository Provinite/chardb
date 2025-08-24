import { Module } from '@nestjs/common';
import { CharacterOwnershipChangesService } from './character-ownership-changes.service';
import { CharacterOwnershipChangesResolver } from './character-ownership-changes.resolver';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [CharacterOwnershipChangesResolver, CharacterOwnershipChangesService],
  exports: [CharacterOwnershipChangesService],
})
export class CharacterOwnershipChangesModule {}