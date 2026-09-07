import { Field, InputType, ID } from "@nestjs/graphql";
import { Type } from "class-transformer";
import { IsArray, IsUUID, ValidateNested } from "class-validator";
import { CharacterFormInput } from "../../characters/dto/character-form.dto";

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
 * `forms` is the complete list the character should end up with, not a patch.
 * Same shape the create and registry inputs use, and the same shape a trait
 * review stores, so the proposal can be compared against what the character
 * has without either side reconstructing the other. That also makes a kit the
 * route by which a member adds a form to a character whose variant allows one:
 * it is a trait change like any other, and it is reviewed like one.
 */
@InputType()
export class EditCharacterTraitsWithKitInput {
  @Field(() => ID, { description: "The kit to spend." })
  @IsUUID()
  itemId: string;

  @Field(() => ID, { description: "The character to change. Must be yours." })
  @IsUUID()
  characterId: string;

  @Field(() => [CharacterFormInput], {
    description:
      "The complete list of forms being proposed, in order, not a patch. " +
      "Nothing is applied until staff approve.",
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CharacterFormInput)
  forms: CharacterFormInput[];
}
