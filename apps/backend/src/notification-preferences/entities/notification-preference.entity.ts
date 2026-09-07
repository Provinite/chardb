import { ObjectType, Field, registerEnumType } from "@nestjs/graphql";
import { NotificationChannel, NotificationKind } from "@chardb/database";

registerEnumType(NotificationChannel, {
  name: "NotificationChannel",
  description:
    "How a notification reaches someone. Transactional mail -- password reset " +
    "and password changed -- is not addressable here: it has no kind, so it " +
    "has no preference and cannot be switched off.",
});

@ObjectType({
  description:
    "One kind's delivery settings for the signed-in member, with defaults " +
    "already applied. A member who has never opened the settings page still " +
    "gets a full answer here.",
})
export class NotificationPreference {
  @Field(() => NotificationKind)
  kind: NotificationKind;

  @Field({ description: "Whether it appears in the bell and the feed." })
  inApp: boolean;

  @Field({ description: "Whether it is also emailed." })
  email: boolean;

  @Field({
    description:
      "False for kinds that have no email template yet. Clients hide the " +
      "email switch rather than offering one that does nothing.",
  })
  emailSupported: boolean;
}

@ObjectType({
  description: "The outcome of following an unsubscribe link from an email.",
})
export class UnsubscribeResult {
  @Field({
    description:
      "False when the link is malformed, tampered with, or names something " +
      "this version does not recognise. The three are not distinguished.",
  })
  success: boolean;

  @Field(() => NotificationKind, {
    nullable: true,
    description:
      "What was switched off, so the page can name it. Null when the link " +
      "did not verify.",
  })
  kind?: NotificationKind | null;
}
