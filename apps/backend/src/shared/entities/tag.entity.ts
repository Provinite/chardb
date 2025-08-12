import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class Tag {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  displayName: string;

  @Field({ nullable: true })
  category?: string;

  @Field({ nullable: true })
  color?: string;

  @Field(() => Date)
  createdAt: Date;
}