import { ObjectType, Field, InputType } from "@nestjs/graphql";
import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
} from "class-validator";

@InputType()
export class LoginInput {
  @Field()
  @IsEmail()
  email: string;

  @Field()
  @IsString()
  password: string;
}

@InputType()
export class SignupInput {
  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  username: string;

  @Field()
  @IsEmail()
  email: string;

  @Field()
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;

  // `@IsOptional()` because the field is nullable in the schema. Without it the
  // string validators run on `undefined` and reject it, so a signup that leaves
  // the display name out -- which the form advertises as allowed -- fails
  // validation instead.
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  inviteCode: string;
}

@ObjectType()
export class AuthPayload {
  @Field()
  accessToken: string;

  // No `refreshToken`. It leaves as an HttpOnly cookie on the same response,
  // so nothing on the page -- including this app -- can read it.
  // See `auth/refresh-cookie.ts`.
}

@InputType()
export class ForgotPasswordInput {
  @Field()
  @IsEmail()
  email: string;
}

@InputType()
export class ResetPasswordInput {
  @Field()
  @IsString()
  @MinLength(1)
  token: string;

  @Field()
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  newPassword: string;
}
