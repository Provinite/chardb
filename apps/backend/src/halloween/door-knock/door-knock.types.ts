import { Field, Int, ObjectType, registerEnumType } from "@nestjs/graphql";

/** Why a door cannot be knocked on right now. */
export enum HalloweenDoorClosedReason {
  /** It is the viewer's own door. */
  OWN_DOOR = "OWN_DOOR",
  /** The viewer, or the door's owner, is not a member of the community. */
  NOT_A_MEMBER = "NOT_A_MEMBER",
  /** The viewer knocked on this door since the last reset. */
  ALREADY_KNOCKED = "ALREADY_KNOCKED",
  /** The viewer has used every door knock since the last reset. */
  NO_KNOCKS_LEFT = "NO_KNOCKS_LEFT",
}

registerEnumType(HalloweenDoorClosedReason, {
  name: "HalloweenDoorClosedReason",
});

@ObjectType({
  description:
    "A member's door, as the viewer finds it: whether they can knock, and " +
    "how many door knocks they have left today.",
})
export class HalloweenDoor {
  @Field()
  canKnock: boolean;

  @Field(() => HalloweenDoorClosedReason, { nullable: true })
  closedReason: HalloweenDoorClosedReason | null;

  @Field(() => Int, {
    description: "The viewer's door knocks left until the daily reset",
  })
  remainingKnocks: number;

  @Field(() => Int, {
    description:
      "The viewer's door knocks a day: as many as /knock gives, twice that " +
      "for Halloween staff",
  })
  knocksPerDay: number;
}

@ObjectType()
export class HalloweenDoorKnockResult {
  @Field(() => [String], {
    description: "The candies the knocker got, by slug",
  })
  knockerCandies: string[];

  @Field(() => [String], {
    description: "The candies the player knocked on got, by slug",
  })
  knockeeCandies: string[];

  @Field(() => Int, {
    description: "The knocker's door knocks left until the daily reset",
  })
  remainingKnocks: number;
}
