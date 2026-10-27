import { Field, Float, InputType, Int, ObjectType } from "@nestjs/graphql";
import { IsInt, IsNumber } from "class-validator";
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

@InputType()
export class HalloweenCandyPlacementInput {
  @Field(() => Int)
  @IsInt()
  knockEventId: number;

  @Field(() => Float)
  @IsNumber()
  x: number;

  @Field(() => Float)
  @IsNumber()
  y: number;

  @Field(() => Float)
  @IsNumber()
  rotation: number;

  @Field(() => Float)
  @IsNumber()
  scale: number;
}

@ObjectType({
  description:
    "A player's Halloween candy board: every candy they have, and where they have stuck the ones on the board",
})
export class HalloweenCandyBoard {
  @Field(() => User)
  owner: User;

  @Field(() => [HalloweenCandy], { description: "Oldest first" })
  candies: HalloweenCandy[];

  @Field(() => [HalloweenCandyPlacement], {
    description:
      "Bottom of the pile first. A candy not here is not on the board.",
  })
  placements: HalloweenCandyPlacement[];
}
