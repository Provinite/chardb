import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsNotEmpty, Length, IsOptional } from 'class-validator';

@InputType()
export class CreateCommunityInput {
  /** Name of the community (must be unique) */
  @Field({ description: 'Name of the community' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name: string;
}

@InputType()
export class UpdateCommunityInput {
  /** Name of the community (must be unique) */
  @Field({ nullable: true, description: 'Name of the community' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name?: string;
}