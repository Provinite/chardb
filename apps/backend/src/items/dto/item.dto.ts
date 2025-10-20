import { Field, InputType, Int, ID } from '@nestjs/graphql';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  Min,
  Max
} from 'class-validator';

@InputType()
export class GrantItemInput {
  @Field(() => ID)
  @IsUUID()
  itemTypeId: string;

  @Field(() => ID)
  @IsUUID()
  userId: string;

  @Field(() => Int, { defaultValue: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(9999)
  quantity?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  metadata?: any; // JSON field for instance-specific data
}

@InputType()
export class UpdateItemInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(9999)
  quantity?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  metadata?: any; // JSON field
}

@InputType()
export class ItemFiltersInput {
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
  ownerId?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  itemTypeId?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  communityId?: string;
}

// Export for service use
export interface ItemFilters {
  limit?: number;
  offset?: number;
  ownerId?: string;
  itemTypeId?: string;
  communityId?: string;
}
