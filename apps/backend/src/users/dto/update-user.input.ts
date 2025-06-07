import { InputType, Field } from '@nestjs/graphql';
import { IsString, MaxLength, IsOptional, IsUrl, IsDateString } from 'class-validator';
import { GraphQLJSON } from 'graphql-type-json';

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
  @IsString()
  @MaxLength(100)
  location?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl()
  website?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  privacySettings?: any;
}