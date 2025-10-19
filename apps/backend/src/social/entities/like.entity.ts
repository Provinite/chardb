import { ObjectType, Field, ID } from '@nestjs/graphql';
import { User } from '../../users/entities/user.entity';
import { Character } from '../../characters/entities/character.entity';
import { Image } from '../../images/entities/image.entity';
import { Gallery } from '../../galleries/entities/gallery.entity';
import { Comment } from '../../comments/entities/comment.entity';
import { LikeableType } from '../dto/like.dto';

@ObjectType()
export class Like {
  @Field(() => ID)
  id: string;

  @Field(() => LikeableType)
  likeableType: LikeableType;

  @Field(() => ID)
  likeableId: string;

  @Field()
  createdAt: Date;

  // Relations
  @Field(() => User)
  user: User;

  @Field(() => ID)
  userId: string;

  // Polymorphic relations (resolved dynamically)
  @Field(() => Character, { nullable: true })
  character?: Character;

  @Field(() => Image, { nullable: true })
  image?: Image;

  @Field(() => Gallery, { nullable: true })
  gallery?: Gallery;

  @Field(() => Comment, { nullable: true })
  comment?: Comment;
}
