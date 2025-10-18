import { InputType, Field } from "@nestjs/graphql";
import { IsEnum } from "class-validator";
import { ExternalAccountProvider } from "@prisma/client";

@InputType()
export class UnlinkExternalAccountInput {
  @Field(() => ExternalAccountProvider)
  @IsEnum(ExternalAccountProvider)
  provider: ExternalAccountProvider;
}
