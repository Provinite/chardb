import { ObjectType, Field, Int } from '@nestjs/graphql';
import { User } from './user.entity';
import { Character } from '../../characters/entities/character.entity';
import { Gallery } from '../../galleries/entities/gallery.entity';
import { Image } from '../../images/entities/image.entity';

@ObjectType()
export class UserStats {
  @Field(() => Int)
  charactersCount: number;

  @Field(() => Int)
  galleriesCount: number;

  @Field(() => Int)
  imagesCount: number;

  @Field(() => Int)
  totalViews: number;

  @Field(() => Int)
  totalLikes: number;

  @Field(() => Int)
  followersCount: number;

  @Field(() => Int)
  followingCount: number;
}

@ObjectType()
export class UserProfile {
  @Field(() => User)
  user: User;

  @Field(() => UserStats)
  stats: UserStats;

  @Field(() => [Character])
  recentCharacters: Character[];

  @Field(() => [Gallery])
  recentGalleries: Gallery[];

  @Field(() => [Image])
  recentImages: Image[];

  @Field(() => [Character])
  featuredCharacters: Character[];

  @Field()
  isOwnProfile: boolean;

  @Field()
  canViewPrivateContent: boolean;
}