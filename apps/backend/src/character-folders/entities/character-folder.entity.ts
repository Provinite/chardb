import { Field, ID, Int, ObjectType } from "@nestjs/graphql";

@ObjectType({
  description:
    "One folder in a person's character workspace. Folders nest, hold " +
    "characters, and belong to exactly one owner.",
})
export class CharacterFolder {
  @Field(() => ID)
  id: string;

  @Field(() => ID, {
    nullable: true,
    description: "Null for a folder at the root of the workspace.",
  })
  parentId?: string | null;

  @Field({ description: "As the owner typed it." })
  name: string;

  @Field({
    description:
      "Hidden from everyone but the owner, along with everything nested " +
      "under it.",
  })
  isPrivate: boolean;

  @Field(() => Int, {
    description:
      "Position among siblings. Zero throughout a workspace nobody has " +
      "reordered, which is what makes the default order alphabetical.",
  })
  sortOrder: number;

  @Field(() => Int, {
    description:
      "Characters in this folder and everything nested under it, counted " +
      "once each however many sub-folders hold them. Excludes characters " +
      "the owner has since traded away, and characters the viewer may not " +
      "see.",
  })
  characterCount: number;
}
