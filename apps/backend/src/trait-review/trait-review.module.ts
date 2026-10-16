import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { ItemsModule } from "../items/items.module";
import { CharacterFormsModule } from "../character-forms/character-forms.module";
import { TraitReviewService } from "./trait-review.service";
import { TraitReviewResolver } from "./trait-review.resolver";
import { TraitReviewCharacterResolver } from "./trait-review-character.resolver";

@Module({
  // ItemsModule is here only so refusing an MYO character can hand its ticket
  // back. Items does not import trait review, so this needs no forwardRef.
  imports: [DatabaseModule, AuthModule, ItemsModule, CharacterFormsModule],
  providers: [
    TraitReviewService,
    TraitReviewResolver,
    TraitReviewCharacterResolver,
  ],
  exports: [TraitReviewService],
})
export class TraitReviewModule {}
