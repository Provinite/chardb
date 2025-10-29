import { Field, InputType, Int, ID } from '@nestjs/graphql';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsUUID,
  MinLength,
  MaxLength,
  Min,
  Max
} from 'class-validator';

@InputType()
export class CreateItemTypeInput {
  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @Field(() => ID)
  @IsUUID()
  communityId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @Field({ defaultValue: true })
  @IsOptional()
  @IsBoolean()
  isStackable?: boolean;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(9999)
  maxStackSize?: number;

  @Field({ defaultValue: true })
  @IsOptional()
  @IsBoolean()
  isTradeable?: boolean;

  @Field({ defaultValue: false })
  @IsOptional()
  @IsBoolean()
  isConsumable?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  iconUrl?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  colorId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  metadata?: any; // JSON field
}

@InputType()
export class UpdateItemTypeInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isStackable?: boolean;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(9999)
  maxStackSize?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isTradeable?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isConsumable?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  iconUrl?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  colorId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  metadata?: any; // JSON field
}

@InputType()
export class ItemTypeFiltersInput {
  @Field(() => Int, { defaultValue: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @Field(() => Int, { defaultValue: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  communityId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  category?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;
}

// Export for service use
export interface ItemTypeFilters {
  limit?: number;
  offset?: number;
  communityId?: string;
  category?: string;
  search?: string;
}
