import { InputType, Field, ID, Int } from "@nestjs/graphql";
import {
  IsString,
  IsNotEmpty,
  Length,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  IsArray,
} from "class-validator";

@InputType()
export class CreateEnumValueInput {
  /** Name/display text of this enum value */
  @Field({ description: "Name/display text of this enum value" })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name: string;

  /** Display order within the trait's enum values */
  @Field(() => Int, {
    nullable: true,
    description:
      "Display order within the trait's enum values. Left out, the value goes after the trait's existing ones.",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  /** ID of the trait this enum value belongs to */
  @Field(() => ID, {
    description: "ID of the trait this enum value belongs to",
  })
  @IsUUID()
  @IsNotEmpty()
  traitId: string;

  /** ID of the color for this enum value */
  @Field(() => ID, {
    nullable: true,
    description: "ID of the color for this enum value",
  })
  @IsOptional()
  @IsUUID()
  colorId?: string;
}

@InputType()
export class ReorderEnumValuesInput {
  /** The trait whose values are being arranged */
  @Field(() => ID, { description: "The trait whose values are being arranged" })
  @IsUUID()
  traitId: string;

  /** Every one of the trait's values, in their new order */
  @Field(() => [ID], {
    description: "Every one of the trait's values, in their new order",
  })
  @IsArray()
  @IsUUID("all", { each: true })
  enumValueIds: string[];
}

@InputType()
export class UpdateEnumValueInput {
  /** Name/display text of this enum value */
  @Field({
    nullable: true,
    description: "Name/display text of this enum value",
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name?: string;

  /** Display order within the trait's enum values */
  @Field(() => Int, {
    nullable: true,
    description: "Display order within the trait's enum values",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  /** ID of the trait this enum value belongs to */
  @Field(() => ID, {
    nullable: true,
    description: "ID of the trait this enum value belongs to",
  })
  @IsOptional()
  @IsUUID()
  @IsNotEmpty()
  traitId?: string;

  /** ID of the color for this enum value */
  @Field(() => ID, {
    nullable: true,
    description: "ID of the color for this enum value",
  })
  @IsOptional()
  @IsUUID()
  colorId?: string;
}
