import { Prisma } from "@chardb/database";

/** Prisma where-clause fragment that excludes soft-deleted characters. */
export const notDeleted = { deletedAt: null } as const;

/**
 * Media a person meant to publish, which is every listing's idea of media.
 *
 * An avatar upload gets a Media row so that a community's moderators can see
 * it -- every queue reaches an image through media -- but it is not a post,
 * and left in the listings it shows up in its owner's library as something
 * they never chose to put there, once per avatar they have ever set.
 *
 * Belongs in listings and their counts, and nowhere else. In particular the
 * moderation queues must NOT use it: the row exists precisely so they can see
 * it, and filtering it out there would put avatars back in the position of
 * being reviewable by nobody.
 */
export const notAvatarUpload = { isAvatarUpload: false } as const;

/**
 * Media a community is answerable for, by either of the two routes there.
 *
 * Through its character is the original and still the primary one: a media
 * attached to a character belongs to whatever community that character's
 * species is in, and follows the character if it moves. `Media.communityId` is
 * the answer for everything else -- a gallery upload, a user avatar -- which
 * has no character and so used to belong nowhere, appear in no community
 * queue, and stay PENDING (and therefore URL-masked, and therefore invisible)
 * until a site admin happened to work through the global queue.
 *
 * One definition rather than the same OR written out at each of the four
 * places that ask this question, because a queue and the count beside it
 * disagreeing about what is in it is the kind of bug nobody reports.
 */
export const mediaBelongingToCommunity = (
  communityId: string,
): Prisma.MediaWhereInput => ({
  OR: [{ character: { species: { communityId } } }, { communityId }],
});
