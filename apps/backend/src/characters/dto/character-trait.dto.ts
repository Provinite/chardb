import { InputType, Field, ID } from "@nestjs/graphql";
import { IsString, IsUUID, IsOptional } from "class-validator";

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
