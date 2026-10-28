import { Field, Float, ID, InputType, Int, ObjectType } from "@nestjs/graphql";
import { User } from "../../users/entities/user.entity";

@ObjectType({ description: "A candy a player got from a lost knock" })
export class HalloweenCandy {
  @Field(() => Int, { description: "The knock that gave it; its id" })
  knockEventId: number;

  @Field({
    description:
      "Which candy it is: its image is /halloween/candy/<slug>.png on the frontend",
  })
  slug: string;

  @Field()
  receivedAt: Date;
}

@ObjectType({
  description:
    "What a placement on a board is: a candy, or the board's nameplate -- a " +
    "banner with its name. Exactly one field is set.",
})
export class HalloweenSticker {
  @Field(() => Int, {
    nullable: true,
    description: "A candy, by the knock that gave it",
  })
  candy?: number | null;

  @Field(() => Boolean, {
    nullable: true,
    description: "The board's nameplate, of which it has one",
  })
  nameplate?: boolean | null;
}

@InputType({
  isOneOf: true,
  description:
    "A sticker on your board: exactly one of a candy, by the knock that " +
    "gave it, or the nameplate (true)",
})
export class HalloweenStickerInput {
  @Field(() => Int, { nullable: true })
  candy?: number;

  @Field(() => Boolean, { nullable: true })
  nameplate?: boolean;
}

@ObjectType({ description: "Where a sticker sits on a board" })
export class HalloweenCandyPlacement {
  @Field(() => HalloweenSticker)
  sticker: HalloweenSticker;

  @Field(() => Float, {
    description: "The candy's centre, as a fraction of the board's width, 0-1",
  })
  x: number;

  @Field(() => Float, {
    description: "The candy's centre, as a fraction of the board's height, 0-1",
  })
  y: number;

  @Field(() => Float, { description: "Degrees clockwise, -180 to 180" })
  rotation: number;

  @Field(() => Float, { description: "Size multiplier, 0.25 to 4" })
  scale: number;
}

// The action inputs carry no class-validator decorators: they arrive as a
// bare `[HalloweenCandyBoardAction!]!` argument, which Nest's ValidationPipe
// never looks inside (see SetItemTypeUsePayoutInput). Their shape is the
// schema's to enforce, and their ranges the zod schema's, on the board the
// actions produce.

@InputType({
  description:
    "Stick a candy from the tray, or the nameplate, on the board, on top of " +
    "the pile. Ranges as on HalloweenCandyPlacement.",
})
export class HalloweenCandyAddInput {
  @Field(() => HalloweenStickerInput)
  sticker: HalloweenStickerInput;

  @Field(() => Float)
  x: number;

  @Field(() => Float)
  y: number;

  @Field(() => Float, { nullable: true, description: "0 unless given" })
  rotation?: number | null;

  @Field(() => Float, { nullable: true, description: "1 unless given" })
  scale?: number | null;
}

@InputType({
  description:
    "Change where a sticker on the board sits, its turn or its size. Only " +
    "the fields given change, and at least one must be.",
})
export class HalloweenCandyEditInput {
  @Field(() => HalloweenStickerInput)
  sticker: HalloweenStickerInput;

  @Field(() => Float, { nullable: true })
  x?: number | null;

  @Field(() => Float, { nullable: true })
  y?: number | null;

  @Field(() => Float, { nullable: true })
  rotation?: number | null;

  @Field(() => Float, { nullable: true })
  scale?: number | null;
}

@InputType({
  isOneOf: true,
  description: "One change to your board: exactly one of these",
})
export class HalloweenCandyBoardAction {
  @Field(() => HalloweenCandyAddInput, { nullable: true })
  add?: HalloweenCandyAddInput;

  @Field(() => HalloweenCandyEditInput, { nullable: true })
  edit?: HalloweenCandyEditInput;

  @Field(() => HalloweenStickerInput, {
    nullable: true,
    description: "Move a sticker on the board to the top of the pile",
  })
  raise?: HalloweenStickerInput;

  @Field(() => HalloweenStickerInput, {
    nullable: true,
    description: "Move a sticker on the board to the bottom of the pile",
  })
  lower?: HalloweenStickerInput;

  @Field(() => HalloweenStickerInput, {
    nullable: true,
    description:
      "Move a sticker one place up the pile; the top one stays where it is",
  })
  forward?: HalloweenStickerInput;

  @Field(() => HalloweenStickerInput, {
    nullable: true,
    description:
      "Move a sticker one place down the pile; the bottom one stays where it is",
  })
  backward?: HalloweenStickerInput;

  @Field(() => HalloweenStickerInput, {
    nullable: true,
    description: "Take a sticker off the board, back to the tray",
  })
  remove?: HalloweenStickerInput;
}

@ObjectType({
  description:
    "Where the light over a board is, which casts the candies' shadows: " +
    "they fall away from it, longer the further to the side and lower it is",
})
export class HalloweenCandyLighting {
  @Field(() => Float, {
    description:
      "Across the board: a point in a unit circle centred on it, -1 to 1",
  })
  x: number;

  @Field(() => Float, {
    description:
      "Up and down the board, downward positive: a point in a unit circle centred on it, -1 to 1",
  })
  y: number;

  @Field(() => Float, { description: "How high it hangs, 0.1 to 1" })
  height: number;

  @Field(() => Float, {
    description:
      "How dark and sharp the shadows are, 0 to 1; it does not change their length",
  })
  intensity: number;

  @Field(() => String, {
    nullable: true,
    description:
      "The light's #rrggbb colour, which colours the candies, background and shadows under it; null for white",
  })
  colour: string | null;

  @Field(() => Float, { description: "How strongly it colours, 0 to 1" })
  colourStrength: number;

  @Field(() => Float, {
    description:
      "How dark the board is outside the pool of light under it, 0 (lit evenly) to 1",
  })
  spotlight: number;

  @Field(() => Float, {
    description:
      "How wide the beam is, 0 to 1; the pool it lights is wider the higher the light",
  })
  cone: number;
}

@InputType({ description: "Where to put the light over your board" })
export class HalloweenCandyLightingInput {
  @Field(() => Float)
  x: number;

  @Field(() => Float)
  y: number;

  @Field(() => Float)
  height: number;

  @Field(() => Float)
  intensity: number;

  @Field(() => String, { nullable: true })
  colour: string | null;

  @Field(() => Float)
  colourStrength: number;

  @Field(() => Float)
  spotlight: number;

  @Field(() => Float)
  cone: number;
}

@ObjectType({
  description:
    "What a board is called: a first word, any joiner and a last word, shown in that order with spaces",
})
export class HalloweenCandyBoardName {
  @Field()
  first: string;

  @Field(() => String, { nullable: true })
  joiner: string | null;

  @Field()
  last: string;
}

@InputType({
  description:
    "A name for your board, its words from the word lists in @chardb/shared",
})
export class HalloweenCandyBoardNameInput {
  @Field()
  first: string;

  @Field(() => String, { nullable: true })
  joiner: string | null;

  @Field()
  last: string;
}

@ObjectType({
  description:
    "How a board's background is muted behind its candies: dimmed, and tinted toward a colour",
})
export class HalloweenCandyBackgroundEffects {
  @Field(() => Float, {
    description: "How much darker it is, 0 (not at all) to 0.8",
  })
  dim: number;

  @Field(() => String, {
    nullable: true,
    description:
      "The #rrggbb colour it is recoloured toward, keeping its light and dark; null for none",
  })
  tint: string | null;

  @Field(() => Float, { description: "How far toward the tint, 0 to 1" })
  tintStrength: number;

  @Field(() => Float, {
    description: "How much of its colour it keeps, 0 (grey) to 1 (as drawn)",
  })
  saturation: number;
}

@InputType({ description: "How to dim and tint your board's background" })
export class HalloweenCandyBackgroundEffectsInput {
  @Field(() => Float)
  dim: number;

  @Field(() => String, { nullable: true })
  tint: string | null;

  @Field(() => Float)
  tintStrength: number;

  @Field(() => Float)
  saturation: number;
}

@ObjectType({
  description:
    "A player's Halloween candy board: every candy they have, and where they have stuck the ones on the board",
})
export class HalloweenCandyBoard {
  @Field(() => ID, { description: "What a link to the board names" })
  id: string;

  @Field(() => User, {
    nullable: true,
    description:
      "The chardb account the board's Discord player is linked to. Null once they unlink.",
  })
  owner: User | null;

  @Field({ description: "Whether whoever is asking owns the board" })
  viewerIsOwner: boolean;

  @Field(() => String, {
    nullable: true,
    description:
      "The picture or tile behind the candies, by its slug: a full picture " +
      "is /halloween/backgrounds/full/<slug>.webp on the frontend, a tile " +
      "(its slug starts tile-) /halloween/backgrounds/tiles/<slug>.webp. Null " +
      "for none chosen, which the frontend shows as graph paper.",
  })
  background: string | null;

  @Field(() => HalloweenCandyBackgroundEffects, {
    nullable: true,
    description: "Null for a background neither dimmed nor tinted",
  })
  backgroundEffects: HalloweenCandyBackgroundEffects | null;

  @Field(() => HalloweenCandyLighting, {
    nullable: true,
    description: "Null for the board's default light",
  })
  lighting: HalloweenCandyLighting | null;

  @Field(() => HalloweenCandyBoardName, {
    nullable: true,
    description: "Null for a board not named",
  })
  name: HalloweenCandyBoardName | null;

  @Field(() => [HalloweenCandy], { description: "Oldest first" })
  candies: HalloweenCandy[];

  @Field(() => [HalloweenCandyPlacement], {
    description:
      "Bottom of the pile first. A candy not here is not on the board.",
  })
  placements: HalloweenCandyPlacement[];
}
