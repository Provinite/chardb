import { InputType, Field } from "@nestjs/graphql";
import { ExternalAccountProvider } from "@prisma/client";

@InputType()
export class UnlinkExternalAccountInput {
  @Field(() => ExternalAccountProvider)
  provider: ExternalAccountProvider;
}
