import { SeedCreateCommunityDocument } from "../../generated/graphql.js";
import { communityUrl } from "../../config.js";
import { definePreset, type Persona } from "../types.js";

export interface AchievementsWorld {
  community: { id: string; slug: string; url: string };
  users: {
    /** Owns the community and earned Trick-or-Treater 2026 in it. */
    alice: Persona;
    /** A member who has earned nothing. */
    bob: Persona;
  };
}

export default definePreset<AchievementsWorld>({
  name: "achievements",
  description:
    "A community where one member has earned Trick-or-Treater 2026 and another member has earned nothing.",

  async build(ctx) {
    const alice = await ctx.user("alice", { canCreateCommunity: true });
    const bob = await ctx.user("bob");

    const { createCommunity: community } = await ctx
      .as("alice")
      .gql(SeedCreateCommunityDocument, {
        createCommunityInput: { name: "Hollowmere", slug: "hollowmere" },
      });
    // Adding a member through the API needs a site admin, which neither is.
    const memberRole = await ctx.prisma.role.findFirstOrThrow({
      where: { communityId: community.id, name: "Member" },
    });
    await ctx.prisma.communityMember.create({
      data: { userId: bob.userId, roleId: memberRole.id },
    });
    // Earned by signing in during the event, which depends on the date the
    // suite runs; seeded directly so the profile has something to show.
    await ctx.prisma.userAchievement.create({
      data: {
        userId: alice.userId,
        communityId: community.id,
        slug: "trick-or-treater-2026",
        earnedAt: new Date("2026-10-15T12:00:00Z"),
      },
    });

    return {
      community: {
        id: community.id,
        slug: community.slug,
        url: communityUrl(community.slug),
      },
      users: { alice, bob },
    };
  },
});
