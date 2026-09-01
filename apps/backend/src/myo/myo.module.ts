import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { ItemsModule } from "../items/items.module";
import { CharactersModule } from "../characters/characters.module";
import { TagsModule } from "../tags/tags.module";
import { TraitReviewModule } from "../trait-review/trait-review.module";
import { MyoService } from "./myo.service";
import { MyoResolver } from "./myo.resolver";

/**
 * The seam between items and characters.
 *
 * Imports both and is imported by neither, which is what keeps this from
 * needing a forwardRef. Anything that has to be known by items or characters
 * belongs in those modules, not here.
 */
@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    ItemsModule,
    CharactersModule,
    TagsModule,
    TraitReviewModule,
  ],
  providers: [MyoService, MyoResolver],
  exports: [MyoService],
})
export class MyoModule {}
