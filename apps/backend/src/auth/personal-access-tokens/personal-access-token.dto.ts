import { Field, ID, InputType, Int, ObjectType } from "@nestjs/graphql";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsBoolean,
  IsIn,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import { ACCESS_TOKEN_LIFETIMES_DAYS } from "./personal-access-tokens.service";

@ObjectType()
export class PersonalAccessTokenCommunityRef {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  slug: string;
}

@ObjectType({ description: "What a token may do in one community." })
export class PersonalAccessTokenGrant {
  @Field(() => PersonalAccessTokenCommunityRef)
  community: PersonalAccessTokenCommunityRef;

  @Field({ description: "Passes gates that ask only for membership." })
  member: boolean;

  @Field(() => [String], {
    description: "Community permission names, such as canManageItems.",
  })
  permissions: string[];
}

@ObjectType()
export class PersonalAccessToken {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field({ description: "The secret's last four characters." })
  displayHint: string;

  @Field(() => [PersonalAccessTokenGrant])
  communities: PersonalAccessTokenGrant[];

  @Field()
  createdAt: Date;

  @Field()
  expiresAt: Date;

  @Field(() => Date, { nullable: true })
  lastUsedAt: Date | null;

  @Field(() => Date, { nullable: true })
  revokedAt: Date | null;
}

@ObjectType()
export class CreatedPersonalAccessToken {
  @Field(() => PersonalAccessToken)
  token: PersonalAccessToken;

  @Field({
    description:
      "The token's secret, sent as `Authorization: Bearer <secret>`. Returned once; it cannot be read again.",
  })
  secret: string;
}

@ObjectType()
export class PersonalAccessTokenGrantOptions {
  @Field(() => [PersonalAccessTokenCommunityRef])
  communities: PersonalAccessTokenCommunityRef[];

  @Field(() => [String], {
    description: "Every community permission a token may be granted.",
  })
  permissions: string[];

  @Field(() => [Int], { description: "Lifetimes a token may have, in days." })
  lifetimesDays: number[];
}

@InputType()
export class PersonalAccessTokenGrantInput {
  @Field(() => ID)
  @IsUUID()
  communityId: string;

  @Field()
  @IsBoolean()
  member: boolean;

  @Field(() => [String])
  @IsString({ each: true })
  permissions: string[];
}

@InputType()
export class CreatePersonalAccessTokenInput {
  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @Field(() => Int)
  @IsIn([...ACCESS_TOKEN_LIFETIMES_DAYS])
  expiresInDays: number;

  @Field(() => [PersonalAccessTokenGrantInput])
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PersonalAccessTokenGrantInput)
  communities: PersonalAccessTokenGrantInput[];
}
