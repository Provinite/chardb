import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { ItemsModule } from "../items/items.module";
import { CharactersModule } from "../characters/characters.module";
import { VariantChangesService } from "./variant-changes.service";
import { VariantChangesResolver } from "./variant-changes.resolver";

/**
 * The seam between items and characters, for variant changes.
 *
 * Imports both and is imported by neither, which is what keeps this off a
 * forwardRef. Same arrangement MyoModule and EditKitsModule use. No
 * TraitReviewModule here, unlike those two: this redemption applies its change
 * outright and opens no review.
 */
@Module({
  imports: [DatabaseModule, AuthModule, ItemsModule, CharactersModule],
  providers: [VariantChangesService, VariantChangesResolver],
  exports: [VariantChangesService],
})
export class VariantChangesModule {}
