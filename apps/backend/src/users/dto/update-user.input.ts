import { InputType, Field, ID } from "@nestjs/graphql";
import {
  IsString,
  MaxLength,
  IsOptional,
  IsUrl,
  IsDateString,
  IsUUID,
} from "class-validator";
import { GraphQLJSON } from "graphql-type-json";
// Type-only, so this adds no runtime dependency on the service. The mapper
// beside this file already reads the same type for the same field.
import type { UserPrivacySettings } from "../users.service";

@InputType()
export class UpdateUserInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl()
  website?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @Field(() => ID, {
    nullable: true,
    description:
      "An image you uploaded, to show as your avatar. It must be approved in moderation first. Explicit null removes your avatar; omitting the field leaves it alone.",
  })
  @IsOptional()
  @IsUUID()
  avatarImageId?: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  privacySettings?: UserPrivacySettings;
}
