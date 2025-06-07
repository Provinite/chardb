import { ObjectType, Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { User } from '../../users/entities/user.entity';

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
  @MinLength(3)
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
}

@ObjectType()
export class AuthPayload {
  @Field(() => User)
  user: User;

  @Field()
  accessToken: string;

  @Field()
  refreshToken: string;
}