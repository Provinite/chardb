import { ObjectType, Field, InputType, ID } from "@nestjs/graphql";
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

  /** Required unless `communityId` names a community with open sign-up. */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  inviteCode?: string;

  /**
   * The community to join without an invite code. Ignored when `inviteCode`
   * is given.
   */
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  communityId?: string;

  /**
   * The solved sign-up challenge from `signupChallenge`, as the widget
   * encodes it: base64 of `{ challenge, solution }`.
   */
  @Field()
  @IsString()
  @MaxLength(4096)
  altchaPayload: string;

  /** A field people never see. Anything in it refuses the sign-up. */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  honeypot?: string;
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
