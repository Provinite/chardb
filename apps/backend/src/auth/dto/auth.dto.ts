import { ObjectType, Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

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

  @Field({ nullable: true })
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

  @Field()
  refreshToken: string;
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