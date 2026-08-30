import { ObjectType, Field, ID, registerEnumType } from "@nestjs/graphql";
import { User } from "../../users/entities/user.entity";

/**
 * How a person is connected to a piece of media.
 *
 * One person often holds several of these at once -- uploading your own art of
 * your own character makes you uploader, artist, media owner and character
 * owner simultaneously -- so a recipient carries a list rather than a single
 * label, and the interesting case is the one where they come apart.
 */
export enum MediaAwardRelation {
  /** Performed the upload. Always present. */
  UPLOADER = "UPLOADER",
  /** Credited as having drawn it, and linked to an account on this site. */
  ARTIST = "ARTIST",
  /** Owns the media record the image hangs off. */
  MEDIA_OWNER = "MEDIA_OWNER",
  /** Owns the character depicted. */
  CHARACTER_OWNER = "CHARACTER_OWNER",
}

registerEnumType(MediaAwardRelation, {
  name: "MediaAwardRelation",
  description: "How a person is connected to a piece of media.",
});

@ObjectType({
  description:
    "Somebody who could be rewarded for a piece of media, and why they " +
    "qualify. Only returned to viewers who can actually grant currency.",
})
export class MediaAwardRecipient {
  @Field(() => ID)
  userId: string;

  @Field(() => User)
  user: User;

  @Field(() => [MediaAwardRelation], {
    description:
      "Every way this person is connected to the media, so the reason they " +
      "appear is never a guess.",
  })
  relations: MediaAwardRelation[];

  @Field(() => Boolean, {
    description:
      "False when they are not a member of this community, in which case " +
      "currency cannot reach them and the award is refused.",
  })
  isMember: boolean;
}
