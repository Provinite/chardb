import { SeedCreateCommunityDocument } from "../../generated/graphql.js";
import { communityUrl } from "../../config.js";
import { ExternalAccountProvider } from "@chardb/database";
import { definePreset, type Persona } from "../types.js";

export interface HalloweenPrizesWorld {
  community: { id: string; slug: string; url: string };
  /** The unlinked winner's Discord handle and id, which only staff see. */
  discordWinner: { username: string; id: string };
  users: {
    /** Owns the community, so grants and manages its items. */
    alice: Persona;
    /** A member with no item permissions. */
    bob: Persona;
    /** Won with a linked Discord account, so everyone sees her name. */
    carol: Persona;
  };
}

/** Discord ids; nothing calls Discord, so any snowflake-shaped string does. */
const GUILD_ID = "100000000000000001";
const CAROL_DISCORD_ID = "200000000000000001";
const UNLINKED_DISCORD_ID = "200000000000000002";

export default definePreset<HalloweenPrizesWorld>({
  name: "halloween-prizes",
  description:
    "A Halloween community with one prize left, one won out, and a win each by a linked and an unlinked Discord player.",

  async build(ctx) {
    const alice = await ctx.user("alice", { canCreateCommunity: true });
    const bob = await ctx.user("bob");
    const carol = await ctx.user("carol");

    const { createCommunity: community } = await ctx
      .as("alice")
      .gql(SeedCreateCommunityDocument, {
        createCommunityInput: { name: "Hollowmere", slug: "hollowmere" },
      });
    await ctx.prisma.community.update({
      where: { id: community.id },
      data: { discordGuildId: GUILD_ID, halloweenEnabled: true },
    });
    const memberRole = await ctx.prisma.role.findFirstOrThrow({
      where: { communityId: community.id, name: "Member" },
    });
    await ctx.prisma.communityMember.create({
      data: { userId: bob.userId, roleId: memberRole.id },
    });
    await ctx.prisma.externalAccount.create({
      data: {
        userId: carol.userId,
        provider: ExternalAccountProvider.DISCORD,
        providerAccountId: CAROL_DISCORD_ID,
        displayName: "carol-on-discord",
      },
    });

    await ctx.prisma.halloweenGuildSettings.create({
      data: {
        guildId: GUILD_ID,
        resetTime: 6,
        knocksPerDay: 3,
        winRate: 0.4,
        winChannel: "300000000000000009",
      },
    });
    await ctx.prisma.halloweenPrize.createMany({
      data: [
        {
          guildId: GUILD_ID,
          id: "adopt",
          name: "Spooky Adopt",
          initialStock: 2,
          currentStock: 1,
          weight: 10,
        },
        {
          guildId: GUILD_ID,
          id: "ghost",
          name: "A Ghost",
          initialStock: 1,
          currentStock: 0,
          weight: 10,
        },
      ],
    });
    const now = Date.now();
    await ctx.prisma.halloweenKnockEvent.create({
      data: {
        guildId: GUILD_ID,
        userId: CAROL_DISCORD_ID,
        prizeId: "adopt",
        discordUsername: "carolknocks",
        time: new Date(now - 2 * 3_600_000),
      },
    });
    await ctx.prisma.halloweenKnockEvent.create({
      data: {
        guildId: GUILD_ID,
        userId: UNLINKED_DISCORD_ID,
        prizeId: "ghost",
        discordUsername: "spookyfan",
        time: new Date(now - 5 * 60_000),
      },
    });

    return {
      community: {
        id: community.id,
        slug: community.slug,
        url: communityUrl(community.slug),
      },
      discordWinner: { username: "spookyfan", id: UNLINKED_DISCORD_ID },
      users: { alice, bob, carol },
    };
  },
});
