import { ExternalAccountProvider, Prisma } from "@chardb/database";

/**
 * Who owns a Halloween candy. A candy from a lost knock belongs to the chardb
 * user who has linked the knocker's Discord account and belongs to the
 * community the guild is linked to. Until both are true it waits, ownerless,
 * on the Discord id, and is claimed when the second happens: on linking
 * (`claimCandiesOnLink`) or on joining (`claimCandiesOnJoin`).
 *
 * These are plain functions over a transaction rather than a service, so the
 * pending-ownership claims can run them without depending on the Halloween
 * module.
 */

/** The chardb user a new candy from this Discord player's knock goes to. */
export async function candyOwnerFor(
  tx: Prisma.TransactionClient,
  guildId: string,
  discordUserId: string,
): Promise<string | null> {
  // One query: it runs inside every lost knock's locked transaction.
  const account = await tx.externalAccount.findFirst({
    where: {
      provider: ExternalAccountProvider.DISCORD,
      providerAccountId: discordUserId,
      user: {
        communityMemberships: {
          some: { role: { community: { discordGuildId: guildId } } },
        },
      },
    },
    select: { userId: true },
  });
  return account?.userId ?? null;
}

/**
 * A candy is claimed once. One that has had an owner and lost them is no
 * longer the knocker's to get back.
 */
const unclaimed = {
  claimedAt: null,
} as const satisfies Prisma.HalloweenCandyWhereInput;

/**
 * Gives a user who has just linked a Discord account the candies waiting on
 * it in the guilds of communities they belong to.
 */
export async function claimCandiesOnLink(
  tx: Prisma.TransactionClient,
  userId: string,
  discordUserId: string,
): Promise<number> {
  const communities = await tx.community.findMany({
    where: {
      discordGuildId: { not: null },
      roles: { some: { communityMembers: { some: { userId } } } },
    },
    select: { discordGuildId: true },
  });
  const guildIds = communities.flatMap((c) =>
    c.discordGuildId ? [c.discordGuildId] : [],
  );
  if (!guildIds.length) return 0;
  const { count } = await tx.halloweenCandy.updateMany({
    where: { ...unclaimed, discordUserId, guildId: { in: guildIds } },
    data: { ownerId: userId, claimedAt: new Date() },
  });
  return count;
}

/**
 * Gives a user who has just joined a community the candies waiting on their
 * linked Discord account in its guild.
 */
export async function claimCandiesOnJoin(
  tx: Prisma.TransactionClient,
  userId: string,
  communityId: string,
): Promise<number> {
  const [community, account] = await Promise.all([
    tx.community.findUnique({
      where: { id: communityId },
      select: { discordGuildId: true },
    }),
    tx.externalAccount.findUnique({
      where: {
        provider_userId: { provider: ExternalAccountProvider.DISCORD, userId },
      },
      select: { providerAccountId: true },
    }),
  ]);
  if (!community?.discordGuildId || !account) return 0;
  const { count } = await tx.halloweenCandy.updateMany({
    where: {
      ...unclaimed,
      guildId: community.discordGuildId,
      discordUserId: account.providerAccountId,
    },
    data: { ownerId: userId, claimedAt: new Date() },
  });
  return count;
}
