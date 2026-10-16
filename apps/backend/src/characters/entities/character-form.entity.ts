import { ObjectType, Field, ID, Int } from "@nestjs/graphql";
import { CharacterTraitValue } from "../../shared/types/character-trait.types";

/**
 * One appearance of a character, with its own trait set.
 *
 * A character always has at least one. All of a character's forms share its
 * species variant -- see the CharacterForm model in schema.prisma for why --
 * so they differ only in name, order and trait values.
 */
@ObjectType({
  description: "One appearance of a character, with its own trait set",
})
export class CharacterForm {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  characterId!: string;

  @Field(() => String, {
    description: 'What the owner calls this form -- "Feral", "Awakened"',
  })
  name!: string;

  @Field(() => Int, {
    description:
      "Position in the character's own ordering, from 0. The form at 0 is the primary form.",
  })
  sortOrder!: number;

  @Field(() => [CharacterTraitValue], {
    description: "Trait values assigned to this form",
  })
  traitValues!: CharacterTraitValue[];

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}
