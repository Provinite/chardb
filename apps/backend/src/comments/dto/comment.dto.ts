import { InputType, Field, ID, Int, registerEnumType } from '@nestjs/graphql';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  MaxLength,
  IsInt,
  Min,
} from 'class-validator';

export enum CommentableType {
  CHARACTER = 'CHARACTER',
  IMAGE = 'IMAGE',
  GALLERY = 'GALLERY',
  USER = 'USER',
}

registerEnumType(CommentableType, {
  name: 'CommentableType',
  description: 'Types of entities that can be commented on',
});

@InputType()
export class CreateCommentInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000, { message: 'Comment content cannot exceed 2000 characters' })
  content: string;

  @Field(() => CommentableType)
  @IsEnum(CommentableType)
  entityType: CommentableType;

  @Field(() => ID)
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  parentId?: string;
}

@InputType()
export class UpdateCommentInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000, { message: 'Comment content cannot exceed 2000 characters' })
  content: string;
}

@InputType()
export class CommentFiltersInput {
  @Field(() => CommentableType, { nullable: true })
  @IsOptional()
  @IsEnum(CommentableType)
  entityType?: CommentableType;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  entityId?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  parentId?: string;

  @Field(() => Int, { defaultValue: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit: number = 20;

  @Field(() => Int, { defaultValue: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  offset: number = 0;
}
