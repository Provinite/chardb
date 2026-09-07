import { InputType, Field, ID, Int } from "@nestjs/graphql";
import {
  IsString,
  IsNotEmpty,
  Length,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  Max,
} from "class-validator";

/**
 * An upper bound on forms per variant, so a typo cannot ask the character page
 * to render a thousand trait sets. Not a product limit -- nobody has asked for
 * more than a handful -- just a number well past any real use.
 */
const MAX_FORMS_CEILING = 10;

@InputType()
export class CreateSpeciesVariantInput {
  /** Name of the species variant (unique within species) */
  @Field({ description: "Name of the species variant" })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name: string;

  /** ID of the species this variant belongs to */
  @Field(() => ID, { description: "ID of the species this variant belongs to" })
  @IsUUID()
  @IsNotEmpty()
  speciesId: string;

  /** ID of the color for this species variant */
  @Field(() => ID, {
    nullable: true,
    description: "ID of the color for this species variant",
  })
  @IsOptional()
  @IsUUID()
  colorId?: string;

  /** How many forms a character on this variant may have */
  @Field(() => Int, {
    defaultValue: 1,
    description:
      "How many forms a character on this variant may have. One means the variant does not do forms.",
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_FORMS_CEILING)
  maxForms?: number;
}

@InputType()
export class UpdateSpeciesVariantInput {
  /** Name of the species variant (unique within species) */
  @Field({ nullable: true, description: "Name of the species variant" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name?: string;

  /** ID of the species this variant belongs to */
  @Field(() => ID, {
    nullable: true,
    description: "ID of the species this variant belongs to",
  })
  @IsOptional()
  @IsUUID()
  @IsNotEmpty()
  speciesId?: string;

  /** ID of the color for this species variant */
  @Field(() => ID, {
    nullable: true,
    description: "ID of the color for this species variant",
  })
  @IsOptional()
  @IsUUID()
  colorId?: string;

  /** How many forms a character on this variant may have */
  @Field(() => Int, {
    nullable: true,
    description:
      "How many forms a character on this variant may have. Lowering it does not touch characters that already have more.",
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_FORMS_CEILING)
  maxForms?: number;
}
