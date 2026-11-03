import type { DatabaseService } from "../../database/database.service";

/**
 * The community a user may file something under, from the host they were on,
 * or null if they may not.
 *
 * Used for characterless uploads (`Media.communityId`) and galleries
 * (`Gallery.communityId`), which have no character to answer which community
 * they belong to.
 *
 * Membership is required rather than merely a real id. The value arrives
 * from the client -- the API is one host for every community, so there is no
 * `Host` header to read it off -- and without a check anyone could file
 * their things into a community they have nothing to do with, which is a
 * way to put pictures in front of moderators who never agreed to look at
 * them.
 *
 * A community that has gone missing, or one the user has since left, is not
 * an error: the result is null rather than a failure. Refusing would mean a
 * write that dies because of a membership change between opening the form
 * and submitting it.
 */
export const resolveMemberCommunity = async (
  db: DatabaseService,
  userId: string,
  communityId?: string,
): Promise<string | null> => {
  if (!communityId) return null;

  const membership = await db.communityMember.findFirst({
    where: { userId, role: { communityId } },
    select: { id: true },
  });

  if (membership) return communityId;

  // Global admins are in no community and moderate everywhere, so their own
  // things would otherwise never carry one.
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) return null;

  const community = await db.community.findUnique({
    where: { id: communityId },
    select: { id: true },
  });

  return community?.id ?? null;
};
