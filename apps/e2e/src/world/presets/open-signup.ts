import {
  SeedCreateCommunityDocument,
  SeedRolesByCommunityDocument,
  SeedSetCommunityOpenSignupDocument,
} from "../../generated/graphql.js";
import { communityUrl } from "../../config.js";
import { definePreset, type Persona } from "../types.js";

interface OpenSignupCommunity {
  id: string;
  name: string;
  slug: string;
  /** The community's own origin, without a trailing slash. */
  url: string;
  /** The stock Member role. */
  memberRoleId: string;
}

export interface OpenSignupWorld {
  /** Anyone may join, as a Member. */
  open: OpenSignupCommunity;
  /** Joining takes an invite. */
  closed: OpenSignupCommunity;
  users: {
    /** Created both communities, so holds Admin in each. */
    commadmin: Persona;
    /** A member of neither. */
    outsider: Persona;
  };
}

export default definePreset<OpenSignupWorld>({
  name: "open-signup",
  description:
    "One community anyone can join as a Member, one that takes an invite, and an account belonging to neither.",

  async build(ctx) {
    const commadmin = await ctx.user("commadmin", { canCreateCommunity: true });
    const outsider = await ctx.user("outsider");

    const community = async (
      name: string,
      slug: string,
    ): Promise<OpenSignupCommunity> => {
      const { createCommunity } = await ctx
        .as("commadmin")
        .gql(SeedCreateCommunityDocument, {
          createCommunityInput: { name, slug },
        });
      const { rolesByCommunity } = await ctx
        .as("commadmin")
        .gql(SeedRolesByCommunityDocument, {
          communityId: createCommunity.id,
        });
      const member = rolesByCommunity.nodes.find((r) => r.name === "Member");
      if (!member) throw new Error("Stock Member role missing");
      return {
        ...createCommunity,
        url: communityUrl(createCommunity.slug),
        memberRoleId: member.id,
      };
    };

    const open = await community("Open Glade", "openglade");
    const closed = await community("Closed Hollow", "closedhollow");

    await ctx.as("commadmin").gql(SeedSetCommunityOpenSignupDocument, {
      communityId: open.id,
      roleId: open.memberRoleId,
    });

    return { open, closed, users: { commadmin, outsider } };
  },
});
