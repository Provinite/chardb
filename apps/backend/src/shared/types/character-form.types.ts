import { ObjectType, Field, ID, Int } from "@nestjs/graphql";
import { CharacterTraitValue } from "./character-trait.types";

/**
 * One of a character's forms, as it stood at the moment something was recorded
 * about it -- a trait review, a variant change.
 *
 * Distinct from the live `CharacterForm` on purpose. `formId` is a correlation
 * key rather than a reference: the form it names may since have been renamed,
 * reordered or deleted, and the snapshot still has to render exactly as it did
 * when it was taken. That is why `name` and `sortOrder` are copied in.
 */
@ObjectType({
  description:
    "One of a character's forms, frozen at the moment a change was recorded",
})
export class CharacterFormSnapshot {
  @Field(() => ID, {
    description:
      "The form this was taken from. Not a reference -- the form may since have been deleted.",
  })
  formId!: string;

  @Field(() => String, {
    description: "The form's name when the snapshot was taken",
  })
  name!: string;

  @Field(() => Int, {
    description: "The form's position in the character's order at the time",
  })
  sortOrder!: number;

  @Field(() => [CharacterTraitValue], {
    description: "The form's trait values when the snapshot was taken",
  })
  traitValues!: CharacterTraitValue[];
}

/** Type alias for the Prisma generated JSON type */
export type CharacterFormsJson = PrismaJson.CharacterFormsJson;
