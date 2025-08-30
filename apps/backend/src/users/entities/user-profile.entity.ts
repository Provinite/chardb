import { ObjectType, Field, Int, ID } from "@nestjs/graphql";
import { User } from "./user.entity";
import { Character } from "../../characters/entities/character.entity";
import { Gallery } from "../../galleries/entities/gallery.entity";
import { Media } from "../../media/entities/media.entity";

@ObjectType()
export class UserStats {
  @Field(() => ID)
  userId: string;
}

@ObjectType()
export class UserProfile {
  @Field(() => User)
  user: User;

  @Field()
  isOwnProfile: boolean;

  @Field()
  canViewPrivateContent: boolean;
}
