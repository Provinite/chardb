import { InputType, Field, ID } from "@nestjs/graphql";
import { IsString, IsUUID, IsOptional, MaxLength } from "class-validator";

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

  /** Optional free-text clarifier displayed parenthetically with the value */
  @Field(() => String, {
    description: "Optional free-text clarifier displayed parenthetically with the value",
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: "Clarifier must be a string" })
  @MaxLength(200, { message: "Clarifier must be at most 200 characters" })
  clarifier?: string | null;
}
