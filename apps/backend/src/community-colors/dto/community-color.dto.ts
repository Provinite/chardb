import { Field, InputType, ID } from '@nestjs/graphql';
import {
  IsString,
  IsOptional,
  IsUUID,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

@InputType()
export class CreateCommunityColorInput {
  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @Field()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'hexCode must be a valid hex color code (e.g., #FF5733)',
  })
  @MaxLength(7)
  hexCode: string;

  @Field(() => ID)
  @IsUUID()
  communityId: string;
}

@InputType()
export class UpdateCommunityColorInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'hexCode must be a valid hex color code (e.g., #FF5733)',
  })
  @MaxLength(7)
  hexCode?: string;
}
