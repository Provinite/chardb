import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { CharacterFormsService } from "./character-forms.service";

/**
 * Deliberately depends on nothing but the database.
 *
 * Characters and trait review both write forms and already depend on each
 * other; anything this module imported would risk pulling one of them into a
 * cycle, and the point of it is to be reachable from both without a
 * `forwardRef`.
 */
@Module({
  imports: [DatabaseModule],
  providers: [CharacterFormsService],
  exports: [CharacterFormsService],
})
export class CharacterFormsModule {}
