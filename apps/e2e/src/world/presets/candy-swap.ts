import { SeedCreateCommunityDocument } from "../../generated/graphql.js";
import { communityUrl } from "../../config.js";
import { definePreset, type Persona } from "../types.js";

export interface CandySwapWorld {
  community: { id: string; slug: string; url: string };
  /** Alice's open offer: a berry tart for a banana. */
  offer: { id: string };
  users: {
    /** Owns the community, a candy corn, and the berry tart in her offer. */
    alice: Persona;
    /** Has two bananas, so can take Alice's offer. */
    bob: Persona;
  };
}

/** Discord ids; nothing calls Discord, so any snowflake-shaped string does. */
const GUILD_ID = "100000000000000001";

export default definePreset<CandySwapWorld>({
  name: "candy-swap",
  description:
    "A Halloween community with two players holding candies, one of whom has an open candy swap offer the other can take.",

  async build(ctx) {
    const alice = await ctx.user("alice", { canCreateCommunity: true });
    const bob = await ctx.user("bob");

    const { createCommunity: community } = await ctx
      .as("alice")
      .gql(SeedCreateCommunityDocument, {
        createCommunityInput: { name: "Candlewick", slug: "candlewick" },
      });
    await ctx.prisma.community.update({
      where: { id: community.id },
      data: { discordGuildId: GUILD_ID, halloweenEnabled: true },
    });
    // Only members hold candies; Alice is one as its creator. Adding a member
    // through the API needs a site admin, which no player here is.
    const memberRole = await ctx.prisma.role.findFirstOrThrow({
      where: { communityId: community.id, name: "Member" },
    });
    await ctx.prisma.communityMember.create({
      data: { userId: bob.userId, roleId: memberRole.id },
    });

    // Candies come from knocks on Discord, so they are seeded as a knock
    // leaves them, already claimed by their owner.
    let knocker = 0;
    const candy = async (owner: Persona, slug: string) => {
      const discordUserId = `20000000000000${String(++knocker).padStart(4, "0")}`;
      const knock = await ctx.prisma.halloweenKnockEvent.create({
        data: { guildId: GUILD_ID, userId: discordUserId, candySlug: slug },
      });
      return ctx.prisma.halloweenCandy.create({
        data: {
          guildId: GUILD_ID,
          slug,
          knockEventId: knock.id,
          discordUserId,
          ownerId: owner.userId,
        },
      });
    };

    await candy(alice, "candy-corn");
    const tart = await candy(alice, "berry-tart");
    await candy(bob, "banana");
    await candy(bob, "banana");

    const offer = await ctx.prisma.halloweenCandyOffer.create({
      data: { guildId: GUILD_ID, ownerId: alice.userId, wantSlug: "banana" },
    });
    await ctx.prisma.halloweenCandy.update({
      where: { id: tart.id },
      data: { offerId: offer.id },
    });

    return {
      community: {
        id: community.id,
        slug: community.slug,
        url: communityUrl(community.slug),
      },
      offer: { id: offer.id },
      users: { alice, bob },
    };
  },
});
