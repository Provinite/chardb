import { Field, InputType, ID } from "@nestjs/graphql";
import { Type } from "class-transformer";
import { IsArray, IsUUID, ValidateNested } from "class-validator";
import { CharacterFormsChangeInput } from "../../characters/dto/character-form.dto";

/**
 * Redeeming an item to move one character to another variant.
 *
 * There is no `speciesVariantId` here, and that absence is the design. The
 * item names exactly one destination, so letting the caller send one would
 * create a field that must always equal the grant -- and a field that must
 * always equal something else is a field somebody eventually sets wrong.
 *
 * `forms` says what to add, change or remove, matching every other
 * form-carrying input. It carries the re-picks a move can force: the
 * destination variant may not allow values the character currently holds, and
 * an Uncommon with Blue eyes moving to a Rare that only allows Amber has to
 * say what it becomes. The frontend works out which values are stranded, in
 * every form, and makes the member re-pick them; this input is where those
 * answers arrive. It may be empty when nothing is stranded.
 *
 * The destination's form limit applies too, so moving a two-form character to
 * a tier that allows one is done by submitting the one form it keeps.
 */
@InputType()
export class ChangeCharacterVariantWithItemInput {
  @Field(() => ID, { description: "The item to redeem." })
  @IsUUID()
  itemId: string;

  @Field(() => ID, { description: "The character to move. Must be yours." })
  @IsUUID()
  characterId: string;

  @Field(() => CharacterFormsChangeInput, {
    description:
      "The forms to add, change or remove. What the character ends up with " +
      "must be valid for the variant the item moves it to, which is not " +
      "necessarily the one it is valid for now.",
  })
  @ValidateNested()
  @Type(() => CharacterFormsChangeInput)
  forms: CharacterFormsChangeInput;
}
