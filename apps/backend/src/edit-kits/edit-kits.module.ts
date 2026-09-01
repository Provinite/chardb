import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { ItemsModule } from "../items/items.module";
import { CharactersModule } from "../characters/characters.module";
import { TraitReviewModule } from "../trait-review/trait-review.module";
import { EditKitsService } from "./edit-kits.service";
import { EditKitsResolver } from "./edit-kits.resolver";

/**
 * The seam between items and characters, for trait edits.
 *
 * Imports both and is imported by neither, which is what keeps this off a
 * forwardRef. Same arrangement MyoModule uses; the two are separate because
 * they are separate products, not because the code could not be shared.
 */
@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    ItemsModule,
    CharactersModule,
    TraitReviewModule,
  ],
  providers: [EditKitsService, EditKitsResolver],
  exports: [EditKitsService],
})
export class EditKitsModule {}
