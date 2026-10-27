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

@ObjectType({ description: "Where a candy sits on a board" })
export class HalloweenCandyPlacement {
  @Field(() => Int)
  knockEventId: number;

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

@InputType({ description: "A candy, by the knock that gave it" })
export class HalloweenCandyRefInput {
  @Field(() => Int)
  knockEventId: number;
}

@InputType({
  description:
    "Stick a candy from the tray on the board, on top of the pile. Ranges " +
    "as on HalloweenCandyPlacement.",
})
export class HalloweenCandyAddInput {
  @Field(() => Int)
  knockEventId: number;

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
    "Change where a candy on the board sits, its turn or its size. Only the " +
    "fields given change, and at least one must be.",
})
export class HalloweenCandyEditInput {
  @Field(() => Int)
  knockEventId: number;

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

  @Field(() => HalloweenCandyRefInput, {
    nullable: true,
    description: "Move a candy on the board to the top of the pile",
  })
  raise?: HalloweenCandyRefInput;

  @Field(() => HalloweenCandyRefInput, {
    nullable: true,
    description: "Move a candy on the board to the bottom of the pile",
  })
  lower?: HalloweenCandyRefInput;

  @Field(() => HalloweenCandyRefInput, {
    nullable: true,
    description:
      "Move a candy one place up the pile; the top one stays where it is",
  })
  forward?: HalloweenCandyRefInput;

  @Field(() => HalloweenCandyRefInput, {
    nullable: true,
    description:
      "Move a candy one place down the pile; the bottom one stays where it is",
  })
  backward?: HalloweenCandyRefInput;

  @Field(() => HalloweenCandyRefInput, {
    nullable: true,
    description: "Put a candy on the board back in the tray",
  })
  remove?: HalloweenCandyRefInput;
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

  @Field(() => [HalloweenCandy], { description: "Oldest first" })
  candies: HalloweenCandy[];

  @Field(() => [HalloweenCandyPlacement], {
    description:
      "Bottom of the pile first. A candy not here is not on the board.",
  })
  placements: HalloweenCandyPlacement[];
}
