import {
  SeedCreateCommunityDocument,
  SeedCreateCommunityMemberDocument,
  SeedCreateItemTypeDocument,
  SeedCreateRoleDocument,
  SeedGrantItemDocument,
  SeedRolesByCommunityDocument,
  SeedCreateCurrencyDocument,
  SeedUpdateCurrencyDocument,
  SeedMintCurrencyDocument,
  SeedTransferCurrencyDocument,
  SeedCreateShopItemDocument,
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
  /**
   * Items standing in for what the migration produces: pre-existing holdings
   * with one IMPORT row each, all sharing a batch id. Deliberately larger than
   * the ledger's page size of 25 so the batch straddles a page boundary.
   */
  importedItems: { ids: string[]; batchId: string; count: number };
  /**
   * Two live currencies and one archived one.
   *
   * Currency lives in the same preset as items on purpose: it reuses the item
   * permissions, so the quartermaster persona is already exactly the actor a
   * currency test needs, and a community that has both is the realistic case.
   */
  currencies: {
    /** Carries a symbol, so symbol-first formatting is exercised. */
    coin: { id: string; code: string; name: string };
    /** No symbol, so code-after formatting is exercised. */
    token: { id: string; code: string; name: string };
    /** Archived. Must refuse new transactions but stay readable. */
    retired: { id: string; code: string; name: string };
    /**
     * Untradeable, and `member` holds 40 of it. Fully alive -- granted, spent
     * and refunded as normal -- but it cannot move between members.
     */
    bound: { id: string; code: string; name: string };
  };
  /** What each persona holds of `coin` after seeding. */
  balances: { member: number; othermember: number };
  currencyUrls: { admin: string; ledger: string };
  /**
   * Two listings, priced deliberately differently.
   *
   * `potionListing` has three price options -- one currency, two currencies,
   * and the other currency alone -- because a shop that only ever charges one
   * thing never exercises the case the price model exists for.
   */
  shop: {
    potionListing: { id: string; priceIds: string[] };
    /** Stock of exactly 2, so exhaustion is reachable in a test. */
    locketListing: { id: string; priceIds: string[] };
    /**
     * 1 coin, no stock cap, no per-member cap. For tests that need more lines
     * than the other two listings can produce between them -- the truncation
     * cases, where the interesting number is larger than five.
     */
    bulkListing: { id: string; priceIds: string[] };
    url: string;
  };
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

    // The migration writes one IMPORT row per item that already existed, all in
    // one batch. Nothing in the API can produce those -- by definition they
    // predate the ledger -- so they are seeded directly, in the same shape the
    // migration emits. Without this the most common row type in a real ledger
    // would never be rendered by any test.
    const IMPORT_BATCH = "00000000-0000-0000-0000-0000000000ff";
    const IMPORT_COUNT = 30;

    const importedIds: string[] = [];
    for (let i = 0; i < IMPORT_COUNT; i++) {
      const item = await ctx.prisma.item.create({
        data: {
          itemTypeId: locket.id,
          ownerId: othermember.userId,
          createdAt: new Date("2025-01-15T00:00:00Z"),
        },
      });
      importedIds.push(item.id);
    }

    await ctx.prisma.itemTransaction.createMany({
      data: importedIds.map((itemId) => ({
        communityId: community.id,
        itemTypeId: locket.id,
        itemId,
        kind: "IMPORT" as const,
        batchId: IMPORT_BATCH,
        toUserId: othermember.userId,
        actorLabel: "system",
        reason:
          "Recorded when the item ledger was introduced. Earlier history was not tracked.",
        createdAt: new Date("2025-01-15T00:00:00Z"),
      })),
    });

    // ==================== Currency ====================

    const asQuartermaster = ctx.as("quartermaster");

    const { createCurrency: coin } = await asQuartermaster.gql(
      SeedCreateCurrencyDocument,
      {
        input: {
          communityId: community.id,
          name: "Hollow Coin",
          code: "HC",
          symbol: "⬡",
          description: "Earned from prompts and spent in the shop.",
        },
      },
    );

    const { createCurrency: token } = await asQuartermaster.gql(
      SeedCreateCurrencyDocument,
      {
        input: {
          communityId: community.id,
          name: "Festival Token",
          code: "FT",
        },
      },
    );

    // Archived after creation rather than seeded archived, because that is the
    // only way it can happen in the product and the specs assert on what
    // archiving does to a currency that already has a history.
    const { createCurrency: retired } = await asQuartermaster.gql(
      SeedCreateCurrencyDocument,
      {
        input: {
          communityId: community.id,
          name: "Old Bell Mark",
          code: "OBM",
        },
      },
    );
    await asQuartermaster.gql(SeedUpdateCurrencyDocument, {
      id: retired.id,
      input: { archived: true },
    });

    // An untradeable currency: members earn and spend it but cannot hand it to
    // each other. Created tradeable and then turned off, because that is the
    // order the product allows and the specs care what happens to a currency
    // people already hold.
    const { createCurrency: bound } = await asQuartermaster.gql(
      SeedCreateCurrencyDocument,
      {
        input: {
          communityId: community.id,
          name: "Prompt Points",
          code: "PP",
        },
      },
    );
    await asQuartermaster.gql(SeedUpdateCurrencyDocument, {
      id: bound.id,
      input: { isTradeable: false },
    });

    // Balance written directly rather than minted. How the member came to hold
    // it is not what any spec is about, and a grant would add a MINT row to a
    // ledger whose row counts the currency specs assert on.
    await ctx.prisma.currencyBalance.create({
      data: { currencyId: bound.id, userId: member.userId, amount: 40 },
    });

    // One grant to two members at once. Writes two rows sharing a batch id,
    // which is what a prize round looks like.
    await asQuartermaster.gql(SeedMintCurrencyDocument, {
      input: {
        currencyId: coin.id,
        userIds: [member.userId, othermember.userId],
        amount: 500,
        reason: "Lanternfall placement payout",
        staffNote: "Tier 2 flat rate, agreed in the mod channel",
      },
    });

    // A member-to-member transfer, so the ledger has a two-legged event in it
    // and the two balances end up different from each other. 500/500 would
    // make an off-by-one in either direction invisible.
    await ctx.as("member").gql(SeedTransferCurrencyDocument, {
      input: {
        currencyId: coin.id,
        toUserId: othermember.userId,
        amount: 120,
        reason: "For the adopt",
      },
    });

    // ==================== Shop ====================

    // The member has 380 HC and 0 FT after the transfer above, so the
    // single-currency option is affordable and the ones needing FT are not.
    // That asymmetry is the point: affordability is per option, not per item.
    const { createShopItem: potionListing } = await asQuartermaster.gql(
      SeedCreateShopItemDocument,
      {
        input: {
          communityId: community.id,
          itemTypeId: potion.id,
          name: "Trait Change Potion",
          description: "Rewrites one trait on one character.",
          maxPerUser: 3,
          prices: [
            { components: [{ currencyId: coin.id, amount: 50 }] },
            {
              components: [
                { currencyId: coin.id, amount: 20 },
                { currencyId: token.id, amount: 2 },
              ],
            },
            { components: [{ currencyId: token.id, amount: 5 }] },
          ],
        },
      },
    );

    const { createShopItem: locketListing } = await asQuartermaster.gql(
      SeedCreateShopItemDocument,
      {
        input: {
          communityId: community.id,
          itemTypeId: locket.id,
          name: "Heirloom Locket",
          stock: 2,
          prices: [{ components: [{ currencyId: coin.id, amount: 10 }] }],
        },
      },
    );

    // Cheap, unlimited, and dull on purpose. The other two listings are capped
    // -- three per member, two in stock -- so between them a member can own at
    // most five lines, and the sidebar panel's truncation does not begin until
    // eight. Reproducing #289 needs a listing somebody can simply buy a lot of.
    const { createShopItem: bulkListing } = await asQuartermaster.gql(
      SeedCreateShopItemDocument,
      {
        input: {
          communityId: community.id,
          itemTypeId: potion.id,
          name: "Practice Potion",
          description: "Buy as many as you like.",
          prices: [{ components: [{ currencyId: coin.id, amount: 1 }] }],
        },
      },
    );

    return {
      community: {
        id: community.id,
        name: community.name,
        url: `/communities/${community.id}`,
        ledgerUrl: `/communities/${community.id}/items/ledger`,
      },
      currencies: {
        coin: { id: coin.id, code: coin.code, name: coin.name },
        token: { id: token.id, code: token.code, name: token.name },
        retired: { id: retired.id, code: retired.code, name: retired.name },
        bound: { id: bound.id, code: bound.code, name: bound.name },
      },
      balances: { member: 380, othermember: 620 },
      currencyUrls: {
        admin: `/communities/${community.id}/currencies`,
        ledger: `/communities/${community.id}/currencies/ledger`,
      },
      shop: {
        potionListing: {
          id: potionListing.id,
          priceIds: potionListing.prices.map((p) => p.id),
        },
        locketListing: {
          id: locketListing.id,
          priceIds: locketListing.prices.map((p) => p.id),
        },
        bulkListing: {
          id: bulkListing.id,
          priceIds: bulkListing.prices.map((p) => p.id),
        },
        url: `/communities/${community.id}/shop`,
      },
      itemTypes: {
        potion: { id: potion.id, name: potion.name },
        locket: { id: locket.id, name: locket.name },
      },
      grantedItems: { ids: grantItem.map((i) => i.id) },
      importedItems: {
        ids: importedIds,
        batchId: IMPORT_BATCH,
        count: IMPORT_COUNT,
      },
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
