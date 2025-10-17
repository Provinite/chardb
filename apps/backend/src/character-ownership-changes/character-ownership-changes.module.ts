import { Module, forwardRef } from '@nestjs/common';
import { CharacterOwnershipChangesService } from './character-ownership-changes.service';
import { CharacterOwnershipChangesResolver } from './character-ownership-changes.resolver';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';
import { CharactersModule } from '../characters/characters.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, UsersModule, CharactersModule, forwardRef(() => AuthModule)],
  providers: [CharacterOwnershipChangesResolver, CharacterOwnershipChangesService],
  exports: [CharacterOwnershipChangesService],
})
export class CharacterOwnershipChangesModule {}