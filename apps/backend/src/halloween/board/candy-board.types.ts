import {
  Field,
  Float,
  ID,
  InputType,
  Int,
  ObjectType,
  registerEnumType,
} from "@nestjs/graphql";
import { IsEnum, IsInt, IsNumber, IsOptional } from "class-validator";
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

/** What one change to a board does. */
export enum HalloweenCandyBoardActionType {
  /** Stick a candy from the tray on the board, on top of the pile. */
  ADD = "ADD",
  /** Change where a candy on the board sits, its turn or its size. */
  EDIT = "EDIT",
  /** Move a candy on the board to the top of the pile. */
  RAISE = "RAISE",
  /** Put a candy on the board back in the tray. */
  REMOVE = "REMOVE",
}

registerEnumType(HalloweenCandyBoardActionType, {
  name: "HalloweenCandyBoardActionType",
  description: "What one change to a Halloween candy board does",
});

@InputType({
  description:
    "One change to your board. ADD needs x and y, and takes rotation 0 and " +
    "scale 1 unless given; EDIT changes only the fields given; RAISE and " +
    "REMOVE take none.",
})
export class HalloweenCandyBoardActionInput {
  @Field(() => HalloweenCandyBoardActionType)
  @IsEnum(HalloweenCandyBoardActionType)
  type: HalloweenCandyBoardActionType;

  @Field(() => Int)
  @IsInt()
  knockEventId: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  x?: number | null;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  y?: number | null;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  rotation?: number | null;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  scale?: number | null;
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
