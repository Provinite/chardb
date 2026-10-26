import { Field, ID, ObjectType } from "@nestjs/graphql";

@ObjectType({
  description:
    "Which of its owner's folders one character is filed in, as far as the " +
    "viewer may see.",
})
export class CharacterFolderMembership {
  @Field(() => ID)
  characterId: string;

  @Field(() => [ID], {
    description: "In the workspace's sibling order. Empty when unfiled.",
  })
  folderIds: string[];
}
