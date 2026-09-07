import { InputType, Field } from "@nestjs/graphql";
import { NotificationChannel, NotificationKind } from "@chardb/database";
import { IsBoolean, IsEnum, IsString, MaxLength } from "class-validator";

@InputType({ description: "Sets one channel for one kind, for the caller." })
export class UpdateNotificationPreferenceInput {
  @Field(() => NotificationKind)
  @IsEnum(NotificationKind)
  kind: NotificationKind;

  @Field(() => NotificationChannel)
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @Field({ description: "The new setting. There is no toggle, only a value." })
  @IsBoolean()
  enabled: boolean;
}

@InputType({
  description: "Follows the unsubscribe link from a notification email.",
})
export class UnsubscribeInput {
  @Field({ description: "The opaque token from the link." })
  @IsString()
  // Generous, because a token is fixed-length but the bound exists only to
  // stop an unauthenticated caller handing us something enormous to HMAC.
  @MaxLength(512)
  token: string;
}
