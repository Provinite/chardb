import { InputType, Field, ID } from "@nestjs/graphql";
import {
  IsString,
  IsUUID,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

@InputType({ description: "Input for setting a character trait value" })
export class CharacterTraitValueInput {
  /** The ID of the trait */
  @Field(() => ID, { description: "The ID of the trait" })
  @IsUUID(4, { message: "Trait ID must be a valid UUID" })
  traitId!: string;

  /** The value of the trait */
  @Field(() => String, {
    description: "The value of the trait",
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: "Trait value must be a string" })
  value?: string | null;
}

@InputType({ description: "Input for updating character trait values" })
export class UpdateCharacterTraitsInput {
  /** Array of trait values to set for the character */
  @Field(() => [CharacterTraitValueInput], {
    description: "Array of trait values to set for the character",
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CharacterTraitValueInput)
  traitValues!: CharacterTraitValueInput[];
}
