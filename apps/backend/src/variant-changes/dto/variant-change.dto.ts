import { Field, InputType, ID } from "@nestjs/graphql";
import { Type } from "class-transformer";
import { IsArray, IsUUID, ValidateNested } from "class-validator";
import { CharacterTraitValueInput } from "../../characters/dto/character-trait.dto";

/**
 * Redeeming an item to move one character to another variant.
 *
 * There is no `speciesVariantId` here, and that absence is the design. The
 * item names exactly one destination, so letting the caller send one would
 * create a field that must always equal the grant -- and a field that must
 * always equal something else is a field somebody eventually sets wrong.
 *
 * `traitValues` is the complete set the character should end up with, not a
 * patch, matching every other trait-carrying input. It has to be sent even
 * when nothing about the traits is changing, because the destination variant
 * may not allow values the character currently holds: an Uncommon with Blue
 * eyes moving to a Rare that only allows Amber has to say what it becomes.
 * The frontend works out which values are stranded and makes the member
 * re-pick them; this input is where those answers arrive.
 */
@InputType()
export class ChangeCharacterVariantWithItemInput {
  @Field(() => ID, { description: "The item to redeem." })
  @IsUUID()
  itemId: string;

  @Field(() => ID, { description: "The character to move. Must be yours." })
  @IsUUID()
  characterId: string;

  @Field(() => [CharacterTraitValueInput], {
    description:
      "The complete set of trait values the character should end up with, " +
      "not a patch. Must be valid for the variant the item moves it to, " +
      "which is not necessarily the one it is valid for now.",
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CharacterTraitValueInput)
  traitValues: CharacterTraitValueInput[];
}
