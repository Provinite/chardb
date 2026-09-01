import { Field, InputType, ID } from "@nestjs/graphql";
import { Type } from "class-transformer";
import { IsArray, IsUUID, ValidateNested } from "class-validator";
import { CharacterTraitValueInput } from "../../characters/dto/character-trait.dto";

/**
 * Spending an edit kit on one character's traits.
 *
 * Deliberately not {@link UpdateCharacterRegistryInput} with an extra field.
 * Two of that input's fields must not be reachable here, and leaving them off
 * is a stronger guarantee than validating them away:
 *
 * - `registryId` is staff's to assign. A kit buys a trait change, not a
 *   number.
 * - `speciesVariantId` is the whole point of the constraint. A kit changes
 *   traits; moving a character between variants is a different product with
 *   different economics (#172).
 *
 * `traitValues` is the complete set the character should end up with, not a
 * patch. Same shape the create and registry inputs use, and the same shape a
 * trait review stores, so the proposal can be compared against what the
 * character has without either side reconstructing the other.
 */
@InputType()
export class EditCharacterTraitsWithKitInput {
  @Field(() => ID, { description: "The kit to spend." })
  @IsUUID()
  itemId: string;

  @Field(() => ID, { description: "The character to change. Must be yours." })
  @IsUUID()
  characterId: string;

  @Field(() => [CharacterTraitValueInput], {
    description:
      "The complete set of trait values being proposed, not a patch. " +
      "Nothing is applied until staff approve.",
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CharacterTraitValueInput)
  traitValues: CharacterTraitValueInput[];
}
