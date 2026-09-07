import { InputType, Field } from "@nestjs/graphql";
import { IsEmail, IsString, MinLength } from "class-validator";

@InputType()
export class VerifyEmailInput {
  @Field()
  @IsString()
  @MinLength(1)
  token: string;
}

@InputType()
export class ResendVerificationEmailInput {
  @Field()
  @IsEmail()
  email: string;
}
