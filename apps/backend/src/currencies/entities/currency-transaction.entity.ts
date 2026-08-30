import { ObjectType, Field, ID, Int, registerEnumType } from "@nestjs/graphql";
import {
  CurrencyTransactionKind,
  CurrencyTransactionSource,
} from "@chardb/database";

registerEnumType(CurrencyTransactionSource, {
  name: "CurrencyTransactionSource",
  description: "What caused a currency movement.",
  valuesMap: {
    DIRECT: {
      description: "Somebody acted directly, with no other record behind it.",
    },
    MEDIA_APPROVAL: {
      description:
        "Awarded when uploaded media was approved in moderation. sourceId is " +
        "the media -- an image is an implementation detail of a media.",
    },
  },
});

registerEnumType(CurrencyTransactionKind, {
  name: "CurrencyTransactionKind",
  description: "How currency moved.",
  valuesMap: {
    MINT: {
      description:
        "Created into a member's balance by staff. Coin has no other source.",
    },
    BURN: {
      description:
        "Removed from a member's balance by staff, as a correction or a penalty.",
    },
    TRANSFER: {
      description:
        "Moved between two members. Writes one row per side, sharing a batch id.",
    },
    SPEND: {
      description:
        "Spent by the member at a sink. Leaves circulation; there is no treasury.",
    },
    IMPORT: {
      description:
        "Written by a migration for a balance that predates this ledger.",
    },
  },
});

@ObjectType({
  description:
    "One member's side of one currency movement. A transfer is two rows " +
    "sharing a batch id, so each member's statement reads correctly on its own.",
})
export class CurrencyTransaction {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  currencyId: string;

  @Field(() => ID, { description: "Whose balance this row moved." })
  userId: string;

  @Field(() => CurrencyTransactionKind)
  kind: CurrencyTransactionKind;

  @Field(() => Int, {
    description:
      "Signed delta on this row's owner. Negative for BURN, SPEND, and the " +
      "sending side of a TRANSFER.",
  })
  amount: number;

  @Field(() => Int, {
    description:
      "The owner's balance immediately after this row was applied, as " +
      "returned by the increment itself.",
  })
  balanceAfter: number;

  @Field(() => ID, {
    description:
      "Shared by every row one operation wrote -- both legs of a transfer, " +
      "or every member in a bulk mint.",
  })
  batchId: string;

  @Field(() => ID, {
    nullable: true,
    description: "The member on the other side of a transfer.",
  })
  counterpartyId?: string | null;

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
    description:
      "Member-facing. Visible to anyone who can read this statement.",
  })
  reason?: string | null;

  @Field(() => CurrencyTransactionSource, {
    description:
      "What caused this row. The reason says why in words; this says what in " +
      "a form a reader can follow back to the source.",
  })
  source: CurrencyTransactionSource;

  @Field(() => ID, {
    nullable: true,
    description:
      "The record named by `source` -- a media id for MEDIA_APPROVAL. Null " +
      "exactly when source is DIRECT.",
  })
  sourceId?: string | null;

  // staffNote is deliberately NOT a plain @Field. It is resolved conditionally
  // so it can be nulled for viewers without item permissions, exactly as on
  // the item ledger.

  @Field()
  createdAt: Date;
}

@ObjectType()
export class CurrencyTransactionConnection {
  @Field(() => [CurrencyTransaction])
  transactions: CurrencyTransaction[];

  @Field(() => Int)
  total: number;

  @Field()
  hasMore: boolean;
}
