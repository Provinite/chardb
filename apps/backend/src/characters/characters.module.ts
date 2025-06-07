import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CharactersService } from './characters.service';
import { CharactersResolver } from './characters.resolver';

@Module({
  imports: [DatabaseModule],
  providers: [CharactersService, CharactersResolver],
  exports: [CharactersService],
})
export class CharactersModule {}