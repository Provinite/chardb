import { Field, ID, ObjectType } from "@nestjs/graphql";

@ObjectType({ description: "An achievement a user earned in a community." })
export class UserAchievement {
  @Field(() => ID)
  id: string;

  @Field({
    description: "Which achievement it is, e.g. `trick-or-treater-2026`.",
  })
  slug: string;

  @Field()
  name: string;

  @Field({ description: "How it was earned." })
  description: string;

  @Field({
    description: "Path of its picture on the frontend's own origin.",
  })
  imagePath: string;

  @Field()
  earnedAt: Date;
}
