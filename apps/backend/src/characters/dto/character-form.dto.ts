import { InputType, Field, ID } from "@nestjs/graphql";
import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { CharacterTraitValueInput } from "./character-trait.dto";

/**
 * One form, as submitted.
 *
 * A submission is always the character's **complete** form list, in the order
 * they should end up in -- not a patch. Forms whose `id` is absent are
 * created, forms whose `id` is present are updated, and any of the character's
 * existing forms not named in the list are deleted. `sortOrder` is not an
 * input: it comes from the position of the entry in the list, so the client
 * cannot submit two forms claiming the same place.
 */
@InputType({ description: "One of a character's forms" })
export class CharacterFormInput {
  @Field(() => ID, {
    nullable: true,
    description:
      "The form to update. Omit to create a new one. A form of another character is refused.",
  })
  @IsOptional()
  @IsUUID(4, { message: "Form ID must be a valid UUID" })
  id?: string;

  @Field(() => String, { description: "What the owner calls this form" })
  @IsString({ message: "Form name must be a string" })
  @MinLength(1, { message: "Form name is required" })
  @MaxLength(100, { message: "Form name must be at most 100 characters" })
  name!: string;

  @Field(() => [CharacterTraitValueInput], {
    description: "The complete trait set for this form, not a patch",
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CharacterTraitValueInput)
  traitValues!: CharacterTraitValueInput[];
}
