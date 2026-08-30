import { ObjectType, Field, ID, Int, registerEnumType } from "@nestjs/graphql";
import { NotificationKind, NotificationSubjectType } from "@chardb/database";
import { User } from "../../users/entities/user.entity";
import { Community } from "../../communities/entities/community.entity";

registerEnumType(NotificationKind, {
  name: "NotificationKind",
  description:
    "What happened. Determines which of the snapshot fields below are set.",
});

registerEnumType(NotificationSubjectType, {
  name: "NotificationSubjectType",
  description:
    "What clicking the notification opens. Paired with subjectId, and null " +
    "on notifications that link nowhere.",
});

@ObjectType({
  description:
    "One thing that happened, addressed to one recipient. Rows are snapshots: " +
    "the display fields were captured when the notification was written, so a " +
    "notification about a since-deleted subject still says what happened, and " +
    "its link is the part that goes dead.",
})
export class Notification {
  @Field(() => ID)
  id: string;

  @Field(() => NotificationKind)
  kind: NotificationKind;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date, {
    nullable: true,
    description:
      "When the badge stopped counting this. Set in bulk when the recipient " +
      "opens the dropdown.",
  })
  seenAt?: Date | null;

  @Field(() => Date, {
    nullable: true,
    description: "When the recipient opened this particular notification.",
  })
  readAt?: Date | null;

  @Field(() => User, {
    nullable: true,
    description: "Who caused it. Null when it was not a person.",
  })
  actor?: User | null;

  @Field(() => String, {
    nullable: true,
    description:
      'Names a non-user actor: "system". Set exactly when actor is null.',
  })
  actorLabel?: string | null;

  @Field(() => Community, {
    nullable: true,
    description:
      "The community this belongs to, for kinds that are scoped to one.",
  })
  community?: Community | null;

  @Field(() => NotificationSubjectType, { nullable: true })
  subjectType?: NotificationSubjectType | null;

  @Field(() => ID, {
    nullable: true,
    description:
      "The subject's id. Deliberately not a foreign key, so it may name " +
      "something that has since been deleted.",
  })
  subjectId?: string | null;

  @Field(() => String, {
    nullable: true,
    description: "Free text, for the kinds that carry it.",
  })
  body?: string | null;

  // The snapshot, projected into typed scalars. The column behind these is a
  // per-kind object validated by zod; it is flattened here rather than exposed
  // as JSON because the JSON scalar generates `any` on the client.

  @Field(() => String, {
    nullable: true,
    description:
      "What the notification is about, named when it was written: an item " +
      "type, a currency, a commented-on character.",
  })
  subjectName?: string | null;

  @Field(() => Int, {
    nullable: true,
    description: "How many, for the kinds that move a quantity of something.",
  })
  count?: number | null;

  @Field(() => Int, {
    nullable: true,
    description: "How much currency arrived.",
  })
  amount?: number | null;

  @Field(() => String, {
    nullable: true,
    description: "Why, when staff gave a reason.",
  })
  reason?: string | null;

  @Field(() => String, {
    nullable: true,
    description: "Enough of a comment to recognise it in a dropdown row.",
  })
  excerpt?: string | null;
}

@ObjectType({ description: "A page of notifications, newest first." })
export class NotificationConnection {
  @Field(() => [Notification])
  nodes: Notification[];

  @Field(() => Int)
  totalCount: number;

  @Field()
  hasNextPage: boolean;

  @Field()
  hasPreviousPage: boolean;
}
