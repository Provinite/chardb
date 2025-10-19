import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
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

  @Field(() => ID)
  authorId: string;
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
