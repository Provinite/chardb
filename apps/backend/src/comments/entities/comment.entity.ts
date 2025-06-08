import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { User } from '../../users/entities/user.entity';
import { Character } from '../../characters/entities/character.entity';
import { Image } from '../../images/entities/image.entity';
import { Gallery } from '../../galleries/entities/gallery.entity';
import { CommentableType } from '../dto/comment.dto';

@ObjectType()
export class Comment {
  @Field(() => ID)
  id: string;

  @Field()
  content: string;

  @Field(() => CommentableType)
  commentableType: CommentableType;

  @Field(() => ID)
  commentableId: string;

  @Field(() => ID, { nullable: true })
  parentId?: string;

  @Field()
  isHidden: boolean;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  // Relations
  @Field(() => User)
  author: User;

  @Field(() => ID)
  authorId: string;

  @Field(() => Comment, { nullable: true })
  parent?: Comment;

  @Field(() => [Comment])
  replies: Comment[];

  // Polymorphic relations (resolved dynamically)
  @Field(() => Character, { nullable: true })
  character?: Character;

  @Field(() => Image, { nullable: true })
  image?: Image;

  @Field(() => Gallery, { nullable: true })
  gallery?: Gallery;

  // Computed fields
  @Field(() => Int)
  repliesCount: number;
}

@ObjectType()
export class CommentConnection {
  @Field(() => [Comment])
  comments: Comment[];

  @Field()
  hasMore: boolean;

  @Field(() => Int)
  total: number;
}