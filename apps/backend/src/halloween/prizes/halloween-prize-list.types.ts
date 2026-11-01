import { Field, ID, Int, ObjectType, registerEnumType } from "@nestjs/graphql";
import { User } from "../../users/entities/user.entity";

/** Who a public win feed names as the winner, decided by who is looking. */
export enum HalloweenWinnerKind {
  /** A chardb account linked to the winner's Discord: shown to everyone. */
  MEMBER = "MEMBER",
  /** The winner's Discord handle: shown only to staff who hand prizes out. */
  DISCORD = "DISCORD",
  /** Nobody in particular: what everyone else sees of an unlinked winner. */
  ANONYMOUS = "ANONYMOUS",
}

registerEnumType(HalloweenWinnerKind, { name: "HalloweenWinnerKind" });

@ObjectType({
  description:
    "A prize in the Halloween pool as anyone may see it: no draw weight",
})
export class HalloweenPrizeListing {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field(() => String, {
    nullable: true,
    description:
      "The URL staff gave, or a chardb prize's own approved item or character image",
  })
  image: string | null;

  @Field(() => Int)
  initialStock: number;

  @Field(() => Int)
  currentStock: number;

  @Field(() => String, { nullable: true })
  itemTypeId: string | null;

  @Field(() => String, { nullable: true })
  characterId: string | null;
}

@ObjectType({
  description:
    "A win's winner, already narrowed to what the viewer may see of them",
})
export class HalloweenWinner {
  @Field(() => HalloweenWinnerKind)
  kind: HalloweenWinnerKind;

  @Field()
  displayName: string;

  @Field(() => String, {
    nullable: true,
    description:
      "A chardb profile path for a MEMBER, a Discord profile URL for DISCORD",
  })
  url: string | null;

  @Field(() => User, { nullable: true, description: "Set only for a MEMBER" })
  user: User | null;
}

@ObjectType({ description: "One win in the public Halloween feed" })
export class HalloweenPublicWin {
  @Field(() => Int, { description: "The knock's id" })
  id: number;

  @Field()
  time: Date;

  @Field(() => HalloweenPrizeListing)
  prize: HalloweenPrizeListing;

  @Field(() => HalloweenWinner)
  winner: HalloweenWinner;
}
