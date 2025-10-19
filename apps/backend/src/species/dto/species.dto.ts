import { InputType, Field, ID } from '@nestjs/graphql';
import {
  IsString,
  IsNotEmpty,
  Length,
  IsOptional,
  IsBoolean,
  IsUUID,
} from 'class-validator';

@InputType()
export class CreateSpeciesInput {
  /** Name of the species (must be unique) */
  @Field({ description: 'Name of the species' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name: string;

  /** ID of the community that owns this species */
  @Field(() => ID, {
    description: 'ID of the community that owns this species',
  })
  @IsUUID()
  @IsNotEmpty()
  communityId: string;

  /** Whether this species has an associated image */
  @Field({
    nullable: true,
    description: 'Whether this species has an associated image',
    defaultValue: false,
  })
  @IsOptional()
  @IsBoolean()
  hasImage?: boolean;
}

@InputType()
export class UpdateSpeciesInput {
  /** Name of the species (must be unique) */
  @Field({ nullable: true, description: 'Name of the species' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name?: string;

  /** ID of the community that owns this species */
  @Field(() => ID, {
    nullable: true,
    description: 'ID of the community that owns this species',
  })
  @IsOptional()
  @IsUUID()
  @IsNotEmpty()
  communityId?: string;

  /** Whether this species has an associated image */
  @Field({
    nullable: true,
    description: 'Whether this species has an associated image',
  })
  @IsOptional()
  @IsBoolean()
  hasImage?: boolean;
}
