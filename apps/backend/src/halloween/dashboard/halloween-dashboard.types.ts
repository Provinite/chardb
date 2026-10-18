import {
  Field,
  Float,
  ID,
  Int,
  ObjectType,
  registerEnumType,
} from "@nestjs/graphql";
import { User } from "../../users/entities/user.entity";

/** How a prize reaches its winner. */
export enum HalloweenPrizeDelivery {
  /** A chardb item, granted to the winner's Discord account automatically. */
  CHARDB_ITEM = "CHARDB_ITEM",
  /** A chardb character, handed to the winner's Discord account automatically. */
  CHARDB_CHARACTER = "CHARDB_CHARACTER",
  /** Anything else -- an adopt, a commission. Staff hand it over themselves. */
  STAFF = "STAFF",
}

registerEnumType(HalloweenPrizeDelivery, {
  name: "HalloweenPrizeDelivery",
  description: "How a Halloween prize reaches its winner",
});

/** Which wins the win feed shows. */
export enum HalloweenWinFilter {
  ALL = "ALL",
  /** STAFF prizes nobody has marked delivered yet. */
  NEEDS_DELIVERY = "NEEDS_DELIVERY",
  /** Prizes staff have marked delivered. */
  DELIVERED = "DELIVERED",
}

registerEnumType(HalloweenWinFilter, {
  name: "HalloweenWinFilter",
  description: "Which Halloween wins to list",
});

@ObjectType({
  description: "The event's settings in a guild, as /settings sets them",
})
export class HalloweenEventSettings {
  @Field(() => Date, { nullable: true })
  startDate: Date | null;

  @Field(() => Date, { nullable: true })
  endDate: Date | null;

  @Field(() => Int)
  knocksPerDay: number;

  @Field(() => Int, { description: "Hour of the day, US Central, 0-23" })
  resetTime: number;

  @Field(() => Float, { description: "Chance of a knock winning, 0-1" })
  winRate: number;

  @Field(() => String, { nullable: true, description: "Discord channel id" })
  winChannel: string | null;
}

@ObjectType({ description: "Running totals for the event" })
export class HalloweenEventSummary {
  @Field(() => Int)
  knocks: number;

  @Field(() => Int)
  wins: number;

  @Field(() => Int)
  giftiesSent: number;

  @Field(() => Int, { description: "Distinct Discord users who have knocked" })
  players: number;

  @Field(() => Int, {
    description: "Wins of STAFF prizes not yet marked delivered",
  })
  toDeliver: number;
}

@ObjectType({ description: "A prize in the guild's pool" })
export class HalloweenPrizeView {
  @Field(() => ID, { description: "The admin's slug for it, e.g. myo-common" })
  id: string;

  @Field()
  name: string;

  @Field(() => Int)
  initialStock: number;

  @Field(() => Int)
  currentStock: number;

  @Field(() => Int)
  weight: number;

  @Field(() => String, {
    nullable: true,
    description:
      "The URL staff gave, or a chardb prize's own approved item or character image",
  })
  image: string | null;

  @Field(() => HalloweenPrizeDelivery)
  delivery: HalloweenPrizeDelivery;

  @Field(() => String, { nullable: true })
  itemTypeId: string | null;

  @Field(() => String, { nullable: true })
  characterId: string | null;
}

@ObjectType({ description: "One winning knock" })
export class HalloweenWin {
  @Field(() => Int, { description: "The knock's id" })
  id: number;

  @Field()
  time: Date;

  @Field(() => String)
  discordUserId: string;

  @Field(() => User, {
    nullable: true,
    description:
      "The chardb account the winner's Discord is linked to. A chardb prize " +
      "is theirs already if this is set, and waits for the link if not.",
  })
  linkedUser: User | null;

  @Field(() => String, { nullable: true })
  deviantArtName: string | null;

  @Field(() => String, {
    nullable: true,
    description: "Discord id of whoever's gifty paid for the knock",
  })
  giftyFromDiscordUserId: string | null;

  @Field(() => HalloweenPrizeView)
  prize: HalloweenPrizeView;

  @Field(() => Date, {
    nullable: true,
    description: "When staff handed over a STAFF prize",
  })
  deliveredAt: Date | null;

  @Field(() => User, { nullable: true })
  deliveredBy: User | null;
}

@ObjectType({ description: "The Halloween event as staff see it" })
export class HalloweenDashboard {
  @Field(() => ID)
  communityId: string;

  @Field(() => String, {
    nullable: true,
    description:
      "The community's Discord server, whose events these are. Null until " +
      "one is linked, and then everything else is empty.",
  })
  guildId: string | null;

  @Field(() => HalloweenEventSettings, {
    nullable: true,
    description: "Null until an admin runs /settings set in Discord",
  })
  settings: HalloweenEventSettings | null;

  @Field(() => HalloweenEventSummary)
  summary: HalloweenEventSummary;

  @Field(() => [HalloweenPrizeView])
  prizes: HalloweenPrizeView[];
}

@ObjectType({ description: "A page of Halloween wins, newest first" })
export class HalloweenWinPage {
  @Field(() => [HalloweenWin])
  wins: HalloweenWin[];

  @Field(() => Int, { description: "How many wins match the filter in all" })
  total: number;

  @Field()
  hasMore: boolean;
}

@ObjectType({ description: "Something a Halloween prize can hand over" })
export class HalloweenPrizeOption {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field(() => String, {
    nullable: true,
    description: "Its approved image, which the prize would show",
  })
  image: string | null;
}

@ObjectType({
  description:
    "The community's item types, and its characters nobody owns or has " +
    "been promised: what a new prize can hand over",
})
export class HalloweenPrizeOptions {
  @Field(() => [HalloweenPrizeOption])
  itemTypes: HalloweenPrizeOption[];

  @Field(() => [HalloweenPrizeOption])
  characters: HalloweenPrizeOption[];
}
