import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { CharacterFoldersResolver } from "./character-folders.resolver";
import { CharacterFoldersService } from "./character-folders.service";

@Module({
  imports: [DatabaseModule],
  providers: [CharacterFoldersService, CharacterFoldersResolver],
  exports: [CharacterFoldersService],
})
export class CharacterFoldersModule {}
