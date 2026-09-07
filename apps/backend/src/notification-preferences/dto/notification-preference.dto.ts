import { InputType, Field } from "@nestjs/graphql";
import { NotificationChannel, NotificationKind } from "@chardb/database";
import { IsBoolean, IsEnum } from "class-validator";

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
