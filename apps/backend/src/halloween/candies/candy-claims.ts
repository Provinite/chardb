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

/**
 * Makes giving out one Discord player's candies happen one at a time: a new
 * candy being made for them, and a claim of their waiting candies. Without
 * it, a knock that finds them not yet linked and a link that commits before
 * the knock does each miss the other's work, and the candy waits forever.
 *
 * Held until the transaction ends. The key is this purpose's alone and
 * stays in this file; anything else that needs to serialize on a Discord
 * player takes a lock of its own.
 */
async function lockCandyClaims(
  tx: Prisma.TransactionClient,
  discordUserId: string,
): Promise<void> {
  const key = `halloween:candy-claims:${discordUserId}`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
}

/**
 * Makes the candy a lost knock gives, owned at once if the knocker is linked
 * and a member here, otherwise waiting to be claimed. Returns its owner.
 */
export async function createCandyForKnock(
  tx: Prisma.TransactionClient,
  candy: {
    guildId: string;
    discordUserId: string;
    slug: string;
    knockEventId: number;
    at: Date;
  },
): Promise<string | null> {
  await lockCandyClaims(tx, candy.discordUserId);
  const ownerId = await candyOwnerFor(tx, candy.guildId, candy.discordUserId);
  await tx.halloweenCandy.create({
    data: {
      guildId: candy.guildId,
      slug: candy.slug,
      knockEventId: candy.knockEventId,
      discordUserId: candy.discordUserId,
      receivedAt: candy.at,
      ownerId,
      claimedAt: ownerId ? candy.at : null,
    },
  });
  return ownerId;
}

/** The chardb user a new candy from this Discord player's knock goes to. */
async function candyOwnerFor(
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
  await lockCandyClaims(tx, discordUserId);
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
  await lockCandyClaims(tx, account.providerAccountId);
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
