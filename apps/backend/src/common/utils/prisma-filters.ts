import { Prisma } from "@chardb/database";

/** Prisma where-clause fragment that excludes soft-deleted characters. */
export const notDeleted = { deletedAt: null } as const;

/**
 * Media a community is answerable for, by either of the two routes there.
 *
 * Through its character is the original and still the primary one: a media
 * attached to a character belongs to whatever community that character's
 * species is in, and follows the character if it moves. `Media.communityId` is
 * the answer for everything else -- a gallery upload, for one -- which
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

/** Characters in one of a community's species. */
export const characterBelongingToCommunity = (
  communityId: string,
): Prisma.CharacterWhereInput => ({
  species: { communityId },
});

/**
 * Galleries a community lists, by the same two routes as media: through the
 * gallery's character, or `Gallery.communityId` for one created on the
 * community's host without a character. Matching media's rule keeps a gallery
 * and the media in it in the same community.
 */
export const galleryBelongingToCommunity = (
  communityId: string,
): Prisma.GalleryWhereInput => ({
  OR: [{ character: { species: { communityId } } }, { communityId }],
});
