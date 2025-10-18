import { InputType, Field } from "@nestjs/graphql";
import { IsEnum, IsString, IsNotEmpty } from "class-validator";
import { ExternalAccountProvider } from "@prisma/client";

@InputType()
export class LinkExternalAccountInput {
  @Field(() => ExternalAccountProvider)
  @IsEnum(ExternalAccountProvider)
  provider: ExternalAccountProvider;

  @Field()
  @IsString()
  @IsNotEmpty()
  providerAccountId: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  displayName: string;
}
