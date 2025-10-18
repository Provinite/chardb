import { InputType, Field } from "@nestjs/graphql";
import { ExternalAccountProvider } from "@prisma/client";

@InputType()
export class LinkExternalAccountInput {
  @Field(() => ExternalAccountProvider)
  provider: ExternalAccountProvider;

  @Field()
  providerAccountId: string;

  @Field()
  displayName: string;
}
