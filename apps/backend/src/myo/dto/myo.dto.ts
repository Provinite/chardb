import { Field, InputType, ID } from "@nestjs/graphql";
import { Visibility } from "@chardb/database";
import { Type } from "class-transformer";
import {
  IsString,
  IsArray,
  IsOptional,
  IsUUID,
  IsEnum,
  ValidateNested,
  MinLength,
  MaxLength,
  ArrayMaxSize,
} from "class-validator";
import { CharacterTraitValueInput } from "../../characters/dto/character-trait.dto";

/**
 * Making a character with a ticket.
 *
 * Deliberately not {@link CreateCharacterInput} with an extra field. Four of
 * that input's fields must not be reachable here, and leaving them off is a
 * stronger guarantee than validating them away:
 *
 * - `speciesId` comes from the ticket, not the caller. A ticket that made any
 *   species would be a ticket for every species.
 * - `registryId` is staff's to assign. A member picking one squats a number.
 * - `pendingOwner` and `assignToSelf` produce orphaned characters, which need
 *   `canCreateOrphanedCharacter`. Holding a ticket does not grant that.
 * - `traitReviewSource` is fixed at MYO. It is the record of how this
 *   character came to exist.
 */
@InputType()
export class RedeemMyoTicketInput {
  @Field(() => ID, { description: "The ticket to spend." })
  @IsUUID()
  itemId: string;

  @Field(() => ID, {
    description:
      "Which of the variants this ticket allows. Checked against the " +
      "ticket's grant, not merely against the species.",
  })
  @IsUUID()
  speciesVariantId: string;

  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(15000)
  details?: string;

  @Field(() => Visibility, { defaultValue: Visibility.PUBLIC })
  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility;

  @Field(() => [CharacterTraitValueInput], { defaultValue: [] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CharacterTraitValueInput)
  traitValues?: CharacterTraitValueInput[];

  @Field(() => [String], { defaultValue: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(30)
  tags?: string[];

  @Field(() => String, {
    nullable: true,
    description: "A JSON document, carried as a string, as elsewhere.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  customFields?: string;
}
