import {
  SeedCreateCommunityDocument,
  SeedCreateCommunityMemberDocument,
  SeedCreateItemTypeDocument,
  SeedCreateRoleDocument,
  SeedGrantItemDocument,
  SeedRolesByCommunityDocument,
} from "../../generated/graphql.js";
import { definePreset, type Persona } from "../types.js";

export interface CommunityItemsWorld {
  community: { id: string; name: string; url: string; ledgerUrl: string };
  itemTypes: {
    /** Consumable. The one used for grant and revoke assertions. */
    potion: { id: string; name: string };
    /** Untradeable keepsake. */
    locket: { id: string; name: string };
  };
  /** The three potions `member` holds, granted during seeding as one batch. */
  grantedItems: { ids: string[] };
  roles: { admin: string; quartermaster: string; member: string };
  users: {
    siteadmin: Persona;
    commadmin: Persona;
    /** Holds canManageItems + canGrantItems. Sees staff notes. */
    quartermaster: Persona;
    /** Plain member, holds the granted stack. Must NOT see staff notes. */
    member: Persona;
    /** Plain member in the community with nothing. */
    othermember: Persona;
    /** Belongs to no community. Must not be able to read the ledger at all. */
    outsider: Persona;
  };
}

export default definePreset<CommunityItemsWorld>({
  name: "community-items",
  description:
    "One community with two item types, a quartermaster who can grant, and a " +
    "seeded grant carrying both a public reason and a staff note.",

  async build(ctx) {
    const siteadmin = await ctx.user("siteadmin", {
      isAdmin: true,
      canCreateCommunity: true,
    });
    const commadmin = await ctx.user("commadmin", { canCreateCommunity: true });
    const quartermaster = await ctx.user("quartermaster");
    const member = await ctx.user("member");
    const othermember = await ctx.user("othermember");
    const outsider = await ctx.user("outsider");

    const { createCommunity: community } = await ctx
      .as("commadmin")
      .gql(SeedCreateCommunityDocument, {
        createCommunityInput: { name: "Thornfield Hollow" },
      });

    const { rolesByCommunity } = await ctx
      .as("commadmin")
      .gql(SeedRolesByCommunityDocument, { communityId: community.id });
    const stock = Object.fromEntries(
      rolesByCommunity.nodes.map((r) => [r.name, r.id]),
    );

    // The stock Moderator role carries neither item permission, and the ledger
    // needs a persona that can write items but is not a community admin --
    // otherwise "staff sees the note" and "admin sees everything" are the same
    // assertion and neither pins the item permissions specifically.
    const { createRole: quartermasterRole } = await ctx
      .as("commadmin")
      .gql(SeedCreateRoleDocument, {
        createRoleInput: {
          name: "Quartermaster",
          communityId: community.id,
          canManageItems: true,
          canGrantItems: true,
        },
      });

    // createCommunityMember is gated on GLOBAL isAdmin, not a community
    // permission, so this must run as siteadmin.
    for (const [userId, roleId] of [
      [quartermaster.userId, quartermasterRole.id],
      [member.userId, stock.Member],
      [othermember.userId, stock.Member],
    ] as const) {
      await ctx.as("siteadmin").gql(SeedCreateCommunityMemberDocument, {
        createCommunityMemberInput: { userId, roleId },
      });
    }

    const { createItemType: potion } = await ctx
      .as("quartermaster")
      .gql(SeedCreateItemTypeDocument, {
        input: {
          communityId: community.id,
          name: "Trait Change Potion",
          category: "Consumable",
          isTradeable: true,
          isConsumable: true,
        },
      });

    const { createItemType: locket } = await ctx
      .as("quartermaster")
      .gql(SeedCreateItemTypeDocument, {
        input: {
          communityId: community.id,
          name: "Heirloom Locket",
          category: "Keepsake",
          isTradeable: false,
        },
      });

    // One grant of three, carrying both note fields. It produces three items
    // and three ledger rows sharing a batch id -- which is what the ledger page
    // collapses back into a single "Granted +3" line. Every visibility
    // assertion reads off this batch, so the two strings are deliberately
    // distinct and unlikely to collide with other copy on the page.
    const { grantItem } = await ctx
      .as("quartermaster")
      .gql(SeedGrantItemDocument, {
        input: {
          itemTypeId: potion.id,
          userId: member.userId,
          quantity: 3,
          reason: "Lanternfall prompt completion",
          staffNote: "Bumped from 1 after the tier table turned out ambiguous",
        },
      });

    return {
      community: {
        id: community.id,
        name: community.name,
        url: `/communities/${community.id}`,
        ledgerUrl: `/communities/${community.id}/items/ledger`,
      },
      itemTypes: {
        potion: { id: potion.id, name: potion.name },
        locket: { id: locket.id, name: locket.name },
      },
      grantedItems: { ids: grantItem.map((i) => i.id) },
      roles: {
        admin: stock.Admin,
        quartermaster: quartermasterRole.id,
        member: stock.Member,
      },
      users: {
        siteadmin,
        commadmin,
        quartermaster,
        member,
        othermember,
        outsider,
      },
    };
  },
});
