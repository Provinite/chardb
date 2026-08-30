import { ObjectType, Field, ID, Int, registerEnumType } from "@nestjs/graphql";
import { ItemTransactionKind } from "@chardb/database";

registerEnumType(ItemTransactionKind, {
  name: "ItemTransactionKind",
  description: "How an item moved.",
  valuesMap: {
    GRANT: { description: "Minted by staff or a bot and given to someone." },
    REVOKE: { description: "Taken back and destroyed. Always a correction." },
    TRANSFER: { description: "Moved between two members." },
    CLAIM: {
      description:
        "Released from pending ownership once an external account was linked.",
    },
    USE: { description: "Consumed by its holder." },
  },
});

@ObjectType({
  description:
    "One item, one event. Granting twelve tokens writes twelve rows; group " +
    "them by batchId to collapse them back into one line.",
})
export class ItemTransaction {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  communityId: string;

  @Field(() => ID)
  itemTypeId: string;

  @Field(() => ID)
  itemId: string;

  @Field(() => ItemTransactionKind)
  kind: ItemTransactionKind;

  @Field(() => ID, {
    description:
      "Shared by every row one operation wrote. Group on this to collapse a " +
      "bulk grant into a single line.",
  })
  batchId: string;

  @Field(() => Int, {
    description:
      "How many items this event touched in total. Counting loaded rows is " +
      "wrong once a batch straddles a page boundary, so the server counts it.",
  })
  batchSize: number;

  @Field(() => ID, { nullable: true })
  fromUserId?: string | null;

  @Field(() => ID, { nullable: true })
  toUserId?: string | null;

  @Field(() => ID, {
    nullable: true,
    description: "Null for anything the system did on its own.",
  })
  actorUserId?: string | null;

  @Field(() => String, {
    nullable: true,
    description:
      'Names a non-user actor ("discord-bot", "system"). Set exactly when ' +
      "actorUserId is null.",
  })
  actorLabel?: string | null;

  @Field(() => String, {
    nullable: true,
    description: "Member-facing. Visible to anyone who can read the ledger.",
  })
  reason?: string | null;

  // staffNote is deliberately NOT a plain @Field. It is resolved conditionally
  // in the resolver so it can be nulled for viewers without item permissions.

  @Field()
  createdAt: Date;
}

@ObjectType()
export class ItemTransactionConnection {
  @Field(() => [ItemTransaction])
  transactions: ItemTransaction[];

  @Field(() => Int)
  total: number;

  @Field()
  hasMore: boolean;
}
