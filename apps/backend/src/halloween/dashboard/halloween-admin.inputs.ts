import { Field, Float, InputType, Int } from "@nestjs/graphql";
import {
  IsDate,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from "class-validator";

/**
 * The whole of a guild's event settings, as the page's form submits them.
 * The bot's own rules (start before end, win rate 0-1, ...) are applied by
 * the service, with the bot's messages.
 */
@InputType()
export class HalloweenSettingsInput {
  @Field(() => Date, { nullable: true })
  @ValidateIf((_, v) => v !== null)
  @IsDate()
  startDate: Date | null;

  @Field(() => Date, { nullable: true })
  @ValidateIf((_, v) => v !== null)
  @IsDate()
  endDate: Date | null;

  @Field(() => Int)
  @IsInt()
  knocksPerDay: number;

  @Field(() => Int, { description: "Hour of the day, US Central, 0-23" })
  @IsInt()
  resetTime: number;

  @Field(() => Float, { description: "Chance of a knock winning, 0-1" })
  @IsNumber()
  winRate: number;

  @Field(() => String, {
    nullable: true,
    description: "Discord channel id wins are also announced in",
  })
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @Matches(/^\d+$/, { message: "Win channel must be a Discord channel id" })
  @MaxLength(30)
  winChannel: string | null;
}

@InputType()
export class CreateHalloweenPrizeInput {
  @Field({ description: "Short name for the prize, e.g. myo-common" })
  @IsString()
  id: string;

  @Field()
  @IsString()
  @MaxLength(200)
  name: string;

  @Field(() => Int)
  @IsInt()
  stock: number;

  @Field(() => Int, { nullable: true, defaultValue: 10 })
  @IsOptional()
  @IsInt()
  weight?: number;

  @Field(() => String, {
    nullable: true,
    description: "For a prize staff hand over themselves only",
  })
  @IsOptional()
  @IsString()
  image?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  itemTypeId?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  characterId?: string | null;
}

/** What can change about a prize once added. Omitted fields stay as they are. */
@InputType()
export class UpdateHalloweenPrizeInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @Field(() => Int, {
    nullable: true,
    description:
      "How many are left. The starting stock moves by the same amount, so " +
      "what has been given out stays the same.",
  })
  @IsOptional()
  @IsInt()
  currentStock?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  weight?: number;

  @Field(() => String, {
    nullable: true,
    description: "For a prize staff hand over themselves only",
  })
  @IsOptional()
  @IsString()
  image?: string | null;
}
