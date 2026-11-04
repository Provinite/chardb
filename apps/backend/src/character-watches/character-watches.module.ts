import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { CharactersModule } from "../characters/characters.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { CharacterWatchesService } from "./character-watches.service";
import { CharacterWatchesResolver } from "./character-watches.resolver";

@Module({
  imports: [DatabaseModule, CharactersModule, NotificationsModule],
  providers: [CharacterWatchesService, CharacterWatchesResolver],
})
export class CharacterWatchesModule {}
