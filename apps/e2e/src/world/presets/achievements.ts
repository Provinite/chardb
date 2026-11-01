import { SeedCreateCommunityDocument } from "../../generated/graphql.js";
import { definePreset, type Persona } from "../types.js";

export interface AchievementsWorld {
  community: { id: string; name: string };
  users: {
    /** Earned Trick-or-Treater 2026 in the community. */
    alice: Persona;
    /** Has earned nothing. */
    bob: Persona;
  };
}

export default definePreset<AchievementsWorld>({
  name: "achievements",
  description:
    "A community where one member has earned Trick-or-Treater 2026 and another has earned nothing.",

  async build(ctx) {
    const alice = await ctx.user("alice", { canCreateCommunity: true });
    const bob = await ctx.user("bob");

    const { createCommunity: community } = await ctx
      .as("alice")
      .gql(SeedCreateCommunityDocument, {
        createCommunityInput: { name: "Hollowmere", slug: "hollowmere" },
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
      community: { id: community.id, name: community.name },
      users: { alice, bob },
    };
  },
});
