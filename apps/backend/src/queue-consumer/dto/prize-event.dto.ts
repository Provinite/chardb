import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  ValidateIf,
} from "class-validator";

export enum PrizeEventType {
  ITEM_AWARDED = "ITEM_AWARDED",
  CHARACTER_AWARDED = "CHARACTER_AWARDED",
}

export class PrizeEventDto {
  @IsEnum(PrizeEventType)
  eventType: PrizeEventType;

  @IsString()
  discordGuildId: string;

  @IsString()
  discordUserId: string;

  // Required for ITEM_AWARDED
  @ValidateIf((o) => o.eventType === PrizeEventType.ITEM_AWARDED)
  @IsString()
  itemTypeId?: string;

  // Optional for ITEM_AWARDED, defaults to 1
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  // Required for CHARACTER_AWARDED
  @ValidateIf((o) => o.eventType === PrizeEventType.CHARACTER_AWARDED)
  @IsString()
  characterId?: string;

  /**
   * Why the bot awarded this, recorded on the item ledger and shown to members.
   * Optional and additive: an existing producer that omits it still validates,
   * and the handler falls back to a generic reason.
   */
  @IsOptional()
  @IsString()
  reason?: string;
}
