import { InputType, Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { IsString, IsEnum, IsNotEmpty } from 'class-validator';

export enum LikeableType {
  CHARACTER = 'CHARACTER',
  IMAGE = 'IMAGE',
  GALLERY = 'GALLERY',
  COMMENT = 'COMMENT',
}

registerEnumType(LikeableType, {
  name: 'LikeableType',
  description: 'Types of entities that can be liked',
});

@InputType()
export class ToggleLikeInput {
  @Field(() => LikeableType)
  @IsEnum(LikeableType)
  entityType: LikeableType;

  @Field(() => ID)
  @IsString()
  @IsNotEmpty()
  entityId: string;
}

@ObjectType()
export class LikeResult {
  @Field()
  isLiked: boolean;

  @Field()
  likesCount: number;

  @Field(() => LikeableType)
  entityType: LikeableType;

  @Field(() => ID)
  entityId: string;
}

@ObjectType()
export class LikeStatus {
  @Field()
  isLiked: boolean;

  @Field()
  likesCount: number;
}