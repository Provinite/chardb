import { InputType, Field, ID, Int } from "@nestjs/graphql";
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { CharacterTraitValueInput } from "./character-trait.dto";

/**
 * A form being created.
 *
 * Used on its own by the paths that make a character -- creation, an MYO
 * redemption, first-time species assignment -- where there is nothing to patch
 * because nothing exists yet.
 */
@InputType({ description: "A form to add to a character" })
export class NewCharacterFormInput {
  @Field(() => String, { description: "What the owner calls this form" })
  @IsString({ message: "Form name must be a string" })
  @MinLength(1, { message: "Form name is required" })
  @MaxLength(100, { message: "Form name must be at most 100 characters" })
  name!: string;

  @Field(() => [CharacterTraitValueInput], {
    description: "The complete trait set for this form",
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CharacterTraitValueInput)
  traitValues!: CharacterTraitValueInput[];

  @Field(() => Int, {
    nullable: true,
    description:
      "Where this form should sit, from 0. Omit to put it after the character's existing forms.",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

/**
 * A change to a form that already exists.
 *
 * Every field but `id` is optional and means "leave this alone" when absent,
 * which is the point: two people editing different things about a character no
 * longer overwrite each other by echoing back state they never touched.
 */
@InputType({ description: "A change to one of a character's existing forms" })
export class UpdateCharacterFormInput {
  @Field(() => ID, {
    description: "The form to change. Must be this character's.",
  })
  @IsUUID(4, { message: "Form ID must be a valid UUID" })
  id!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString({ message: "Form name must be a string" })
  @MinLength(1, { message: "Form name cannot be blank" })
  @MaxLength(100, { message: "Form name must be at most 100 characters" })
  name?: string;

  @Field(() => [CharacterTraitValueInput], {
    nullable: true,
    description:
      "The complete trait set this form should end up with, not a patch of it.",
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CharacterTraitValueInput)
  traitValues?: CharacterTraitValueInput[];

  @Field(() => Int, {
    nullable: true,
    description:
      "Where this form should sit, from 0. Omit to leave it where it is.",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

/**
 * What to do to a character's forms.
 *
 * Deliberately three lists rather than one complete one. A complete list makes
 * *forgetting* destructive: a client that submits forms without their ids
 * deletes every form the character had and mints replacements, and an id is
 * what a review or an audit row correlates against. Here, removing a form is
 * something you have to ask for by name.
 *
 * It also narrows what two people editing at once can take from each other.
 * With a complete list, saving your form means resending everybody else's as
 * they looked when your page loaded; with this, you send only what you
 * touched. That is not a substitute for real conflict detection (#392) -- two
 * people editing the *same* form still collide -- but it removes the case
 * where they were not even working on the same thing.
 *
 * Omitting the whole input leaves a character's forms alone.
 */
@InputType({ description: "Changes to a character's forms" })
export class CharacterFormsChangeInput {
  @Field(() => [NewCharacterFormInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NewCharacterFormInput)
  newForms?: NewCharacterFormInput[];

  @Field(() => [UpdateCharacterFormInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateCharacterFormInput)
  updateForms?: UpdateCharacterFormInput[];

  @Field(() => [ID], {
    nullable: true,
    description:
      "Forms to delete. A character must keep at least one, so removing them all is refused.",
  })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  removeForms?: string[];
}
