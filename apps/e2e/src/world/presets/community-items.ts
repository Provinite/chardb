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
  SeedSetItemTypeUsePayoutDocument,
  SeedSetItemTypeMyoGrantDocument,
  SeedSetItemTypeTraitEditGrantDocument,
  SeedSetItemTypeVariantChangeGrantDocument,
  SeedApproveTraitReviewDocument,
  SeedCreateTraitDocument,
  SeedCreateEnumValueDocument,
  SeedCreateEnumValueSettingDocument,
  SeedCreateTraitListEntryDocument,
  TraitValueType,
  SeedCreateSpeciesDocument,
  SeedCreateSpeciesVariantDocument,
  SeedCreateCharacterDocument,
} from "../../generated/graphql.js";
import { communityUrl } from "../../config.js";
import { definePreset, type Persona } from "../types.js";

export interface CommunityItemsWorld {
  community: {
    id: string;
    name: string;
    /** The label the community is served from: `thornfield-hollow.<root>`. */
    slug: string;
    /**
     * The community's own origin, absolute and without a trailing slash, so
     * `${world.community.url}/inventory` is a page on it.
     *
     * Absolute because a community is a different ORIGIN from the apex that
     * Playwright's `baseURL` names: a relative path would resolve against the
     * apex and land on the site's 404. Use `communityUrl()` from src/config.ts
     * for a host this handle does not name.
     */
    url: string;
    ledgerUrl: string;
  };
  itemTypes: {
    /** Consumable. The one used for grant and revoke assertions. */
    potion: { id: string; name: string };
    /** Untradeable keepsake. */
    locket: { id: string; name: string };
    /**
     * Consumable, and worth 250 coin when used. The redemption ticket the
     * feature was built for.
     */
    ticket: { id: string; name: string; payout: number };
    /**
     * Consumable and configured with nothing. Using it must be refused, which
     * is a different refusal from an item that cannot be used at all.
     */
    blankTicket: { id: string; name: string };
    /**
     * Consumable, and good for a Thornwing of either Common or Uncommon.
     * Two variants rather than one so "pick one of n" is exercised, and one
     * variant is deliberately left off so a ticket can be proved to refuse it.
     */
    myoTicket: { id: string; name: string };
    /**
     * Consumable, and good for editing the traits of any Thornwing --
     * deliberately species-wide with no variants listed, which is the state
     * that must cover Rare and variant-less characters too.
     */
    editKit: { id: string; name: string };
    /**
     * Consumable, and narrowed to Thornwing Common only. The pair is what
     * proves a variant list narrows rather than decorates.
     */
    commonOnlyEditKit: { id: string; name: string };
    /**
     * Consumable. Moves a Common or an Uncommon Thornwing to Rare, and
     * refuses everything else -- which is what a community actually sells.
     */
    rareUpgrade: { id: string; name: string };
    /**
     * Consumable. Moves *any* Thornwing to Legendary, source list empty, so
     * the permissive reading of that list is covered as well as the narrow
     * one. Legendary permits Amber eyes alone, which makes this the item that
     * strands a trait value and forces a re-pick.
     */
    legendaryAscension: { id: string; name: string };
  };
  /** The three potions `member` holds, granted during seeding as one batch. */
  grantedItems: { ids: string[] };
  /**
   * How many undestroyed items this world contains.
   *
   * Here rather than in the spec that asserts on it. The economy tile's spec
   * used to hard-code 36; when the preset gained MYO tickets it said 38 and
   * broke, and the first repair -- summing these arrays *in the spec* -- broke
   * again the moment edit kits arrived. A spec in another package cannot be
   * the place that knows what this world holds.
   *
   * **Adding a granted item type means adding it to this sum**, which sits
   * beside the grants rather than a directory away.
   */
  totalCirculation: number;
  /** `member`'s two Coin Tickets and one Blank Ticket. */
  usableItems: { ticketIds: string[]; blankTicketId: string };
  /** `member`'s two MYO tickets. Two, so one can be spent and one kept. */
  myoItems: { ticketIds: string[] };
  /** `member`'s edit kits: two species-wide, one narrowed to Common. */
  editKitItems: { kitIds: string[]; commonOnlyKitId: string };
  /**
   * `member`'s variant change items. Two of each, so one can be spent and one
   * kept -- a count that went from 2 to 1 is the only proof that redeeming
   * consumed exactly one.
   */
  variantChangeItems: { rareUpgradeIds: string[]; ascensionIds: string[] };
  /**
   * One enum trait on the species, so an edit kit has something to change.
   * Without it every proposed edit is the empty set and the "changes nothing"
   * refusal is the only reachable outcome.
   */
  traits: { eyeColor: { id: string; values: Record<string, string> } };
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
  /**
   * A species, and the characters hanging off it.
   *
   * The species is not optional scenery: it is the only route from a character
   * to a community, so a character trade cannot be scoped without one.
   */
  species: { id: string; name: string };
  /**
   * Three variants, of which the MYO ticket grants the first two.
   *
   * `rare` exists to be refused: a ticket good for two of three variants is
   * the only shape that proves the allow-list is read at all, rather than the
   * species being taken as permission for everything under it.
   */
  variants: {
    common: { id: string; name: string };
    uncommon: { id: string; name: string };
    rare: { id: string; name: string };
    /**
     * The narrow one: its enum settings permit Amber and nothing else, where
     * the other three take every colour.
     *
     * A fourth variant rather than narrowing one of the three above, so that
     * every spec written before this branch keeps the data it was written
     * against.
     */
    legendary: { id: string; name: string };
  };
  characters: {
    /** `member`'s. Open to trades, and nothing else. Changes hands. */
    bramblefoot: { id: string; name: string; url: string };
    /**
     * `member`'s. A freebie, and closed to trades -- so it must offer no trade
     * affordance anywhere while still being findable by an availability
     * filter, which is the pair of facts the two suites need from it.
     */
    hearthstone: { id: string; name: string; url: string };
    /** `othermember`'s. Open to trades and for sale in coin. */
    marrowfen: { id: string; name: string; url: string };
    /**
     * `member`'s Common Thornwing with Blue eyes, review settled.
     *
     * The variant change happy path. Blue is permitted by Rare as well as
     * Common, so moving it to Rare strands nothing -- which is what separates
     * this from the Legendary case.
     */
    pinefall: { id: string; name: string; url: string };
    /**
     * `member`'s Rare Thornwing with Amber eyes, review settled.
     *
     * Already the Rare upgrade's destination, so that refusal has a subject.
     * Amber is the one colour Legendary permits, so the Ascension moves it
     * with nothing stranded.
     */
    emberwake: { id: string; name: string; url: string };
    /**
     * `member`'s Legendary Thornwing with Amber eyes, review settled.
     *
     * Outside the Rare upgrade's source list without being its destination,
     * which is a different refusal from Emberwake's and reads differently to
     * the member.
     */
    ashglass: { id: string; name: string; url: string };
    /**
     * How many `member` owns in total, filler included. More than one page of
     * any list that shows them, which is what the paging specs need.
     */
    memberTotal: number;
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
        createCommunityInput: {
          name: "Thornfield Hollow",
          slug: "thornfield-hollow",
        },
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

    // ==================== Species and characters ====================

    // createSpecies has no global-admin bypass, so the actor must genuinely
    // hold canCreateSpecies. commadmin does, as the community's Admin.
    const { createSpecies: species } = await ctx
      .as("commadmin")
      .gql(SeedCreateSpeciesDocument, {
        createSpeciesInput: {
          name: "Thornwing",
          communityId: community.id,
        },
      });

    // Variants, for the MYO ticket further down. Created by commadmin for the
    // same reason the species is: canEditSpecies is not on the Member role.
    const variant = async (name: string) => {
      const { createSpeciesVariant } = await ctx
        .as("commadmin")
        .gql(SeedCreateSpeciesVariantDocument, {
          createSpeciesVariantInput: { name, speciesId: species.id },
        });
      return { id: createSpeciesVariant.id, name: createSpeciesVariant.name };
    };
    const common = await variant("Common");
    const uncommon = await variant("Uncommon");
    const rare = await variant("Rare");
    const legendary = await variant("Legendary");

    // One enum trait, so an edit kit has something to change. Every character
    // below is seeded without trait values, which keeps their creation from
    // opening a PENDING review and leaves the edit-kit specs a clean slate.
    const { createTrait: eyeColor } = await ctx
      .as("commadmin")
      .gql(SeedCreateTraitDocument, {
        createTraitInput: {
          speciesId: species.id,
          name: "Eye Color",
          valueType: TraitValueType.Enum,
          allowsClarifier: false,
          allowsMultipleValues: false,
        },
      });

    const eyeColorValues: Record<string, string> = {};
    for (const [i, name] of ["Blue", "Green", "Amber"].entries()) {
      const { createEnumValue } = await ctx
        .as("commadmin")
        .gql(SeedCreateEnumValueDocument, {
          createEnumValueInput: { traitId: eyeColor.id, name, order: i },
        });
      eyeColorValues[name.toLowerCase()] = createEnumValue.id;
    }

    // Every variant is configured, because an unconfigured one is dead: a
    // variant with no trait-list entry does not carry the trait, and an enum
    // allow-list with no rows allows nothing. A world whose variants were left
    // blank while its characters held trait values was modelling a state the
    // product does not have.
    //
    // Legendary is the narrow one -- Amber only -- so that "a variant
    // restricts its options" has something to bite on. The other three take
    // every colour.
    for (const v of [common, uncommon, rare, legendary]) {
      await ctx.as("commadmin").gql(SeedCreateTraitListEntryDocument, {
        input: {
          traitId: eyeColor.id,
          speciesVariantId: v.id,
          order: 0,
          required: false,
          valueType: TraitValueType.Enum,
        },
      });
    }

    for (const [variantId, colours] of [
      [common.id, ["blue", "green", "amber"]],
      [uncommon.id, ["blue", "green", "amber"]],
      [rare.id, ["blue", "green", "amber"]],
      [legendary.id, ["amber"]],
    ] as const) {
      for (const colour of colours) {
        await ctx.as("commadmin").gql(SeedCreateEnumValueSettingDocument, {
          createEnumValueSettingInput: {
            speciesVariantId: variantId,
            enumValueId: eyeColorValues[colour],
          },
        });
      }
    }

    // assignToSelf, so each character is owned by whoever seeds it. The stock
    // Member role carries canCreateCharacter, so both members can.
    const character = async (
      persona: "member" | "othermember",
      name: string,
      availability: {
        isTradeable?: boolean;
        isFreebie?: boolean;
        isSellableForCoin?: boolean;
      },
    ) => {
      const { createCharacter } = await ctx
        .as(persona)
        .gql(SeedCreateCharacterDocument, {
          input: { name, speciesId: species.id, ...availability },
        });
      return {
        id: createCharacter.id,
        name: createCharacter.name,
        // On the community's host: a character belongs to its species'
        // community, and that is where the page is served from.
        url: communityUrl(community.slug, `/character/${createCharacter.id}`),
      };
    };

    // Enough of member's characters to run past a page.
    //
    // Seeded straight through Prisma rather than the API, the way the imported
    // items above are: thirty createCharacter calls would be thirty round
    // trips to prove one Load More button. Backdated so the three named
    // characters below sort ahead of them under the default "newest first" --
    // the browse specs look for those by name on the first page, and would
    // start failing if this filler pushed them off it.
    const FILLER_COUNT = 30;
    await ctx.prisma.character.createMany({
      data: Array.from({ length: FILLER_COUNT }, (_, i) => ({
        name: `Hollow Understudy ${String(i + 1).padStart(2, "0")}`,
        speciesId: species.id,
        ownerId: member.userId,
        creatorId: member.userId,
        createdAt: new Date("2025-02-01T00:00:00Z"),
      })),
    });

    // Two asymmetries at once. For the trade specs: one open character on each
    // side, and one closed to trades to prove the flag withholds the whole
    // affordance rather than greying it out. For the browse specs: three
    // different sets of availability kinds, so a filter has something to
    // discriminate and "any of these" can be told apart from "all of these".
    const bramblefoot = await character("member", "Bramblefoot", {
      isTradeable: true,
    });
    const hearthstone = await character("member", "Hearthstone", {
      isFreebie: true,
    });
    const marrowfen = await character("othermember", "Marrowfen", {
      isTradeable: true,
      isSellableForCoin: true,
    });

    // Characters that actually *are* a variant.
    //
    // The three above deliberately have none, which is the state the edit-kit
    // specs need. A variant change has nothing to bite on there: every refusal
    // it can produce -- already the destination, outside the source list --
    // is about which variant a character currently is.
    //
    // Their CREATION reviews are approved as they are seeded. Creating a
    // character with trait values opens one, and a character with a review
    // still pending cannot be moved at all, so leaving them pending would put
    // every one of these characters permanently out of reach of the feature
    // they exist to test.
    const settledCharacter = async (
      name: string,
      variantId: string,
      colour: "blue" | "green" | "amber",
    ) => {
      const { createCharacter } = await ctx
        .as("member")
        .gql(SeedCreateCharacterDocument, {
          input: {
            name,
            speciesId: species.id,
            speciesVariantId: variantId,
            traitValues: [
              { traitId: eyeColor.id, value: eyeColorValues[colour] },
            ],
          },
        });

      const review = await ctx.prisma.traitReview.findFirst({
        where: { characterId: createCharacter.id },
        select: { id: true },
      });
      if (!review) {
        throw new Error(`${name} was seeded without the review it needs`);
      }
      await ctx.as("commadmin").gql(SeedApproveTraitReviewDocument, {
        input: { reviewId: review.id },
      });

      return {
        id: createCharacter.id,
        name: createCharacter.name,
        url: communityUrl(community.slug, `/character/${createCharacter.id}`),
      };
    };

    // Common, with an eye colour Rare also permits. The happy path: it moves
    // to Rare with nothing stranded.
    const pinefall = await settledCharacter("Pinefall", common.id, "blue");
    // Already Rare, so a Rare ticket has to refuse it -- and with Amber eyes,
    // so the Legendary ticket can move it without stranding anything.
    const emberwake = await settledCharacter("Emberwake", rare.id, "amber");
    // Legendary, which is not in the Rare ticket's source list. The refusal
    // this proves is a different one from Emberwake's.
    const ashglass = await settledCharacter("Ashglass", legendary.id, "amber");

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

    // ==================== Usable items ====================

    // The case that motivated item use: a ticket you redeem for coin. Created
    // after the currencies because its payout names one, which is also the
    // real ordering constraint -- a payout cannot be configured before the
    // currency it pays exists.
    const { createItemType: ticket } = await asQuartermaster.gql(
      SeedCreateItemTypeDocument,
      {
        input: {
          communityId: community.id,
          name: "Coin Ticket",
          category: "Redeemable",
          isTradeable: true,
          isConsumable: true,
        },
      },
    );

    await asQuartermaster.gql(SeedSetItemTypeUsePayoutDocument, {
      input: {
        itemTypeId: ticket.id,
        components: [{ currencyId: coin.id, amount: 250 }],
      },
    });

    const { grantItem: ticketItems } = await asQuartermaster.gql(
      SeedGrantItemDocument,
      {
        input: {
          itemTypeId: ticket.id,
          userId: member.userId,
          quantity: 2,
          reason: "Event prize",
        },
      },
    );

    // Consumable, but nothing configured. Using it must be refused rather
    // than destroying the item for nothing -- which is a different failure
    // from "this item cannot be used at all".
    const { createItemType: blankTicket } = await asQuartermaster.gql(
      SeedCreateItemTypeDocument,
      {
        input: {
          communityId: community.id,
          name: "Blank Ticket",
          category: "Redeemable",
          isTradeable: true,
          isConsumable: true,
        },
      },
    );

    const { grantItem: blankTicketItems } = await asQuartermaster.gql(
      SeedGrantItemDocument,
      {
        input: {
          itemTypeId: blankTicket.id,
          userId: member.userId,
          quantity: 1,
          reason: "Event prize",
        },
      },
    );

    // An MYO ticket: spend it, make a Thornwing. Good for Common or Uncommon
    // but deliberately not Rare, so a spec can prove the ticket's allow-list
    // is what is checked rather than the species.
    const { createItemType: myoTicket } = await asQuartermaster.gql(
      SeedCreateItemTypeDocument,
      {
        input: {
          communityId: community.id,
          name: "Thornwing MYO Ticket",
          category: "Redeemable",
          isTradeable: true,
          isConsumable: true,
        },
      },
    );

    await asQuartermaster.gql(SeedSetItemTypeMyoGrantDocument, {
      input: {
        itemTypeId: myoTicket.id,
        speciesId: species.id,
        speciesVariantIds: [common.id, uncommon.id],
      },
    });

    // Two: one to spend, one still in hand afterwards. A single ticket cannot
    // tell "the redemption consumed the right item" from "the redemption
    // consumed everything".
    const { grantItem: myoItems } = await asQuartermaster.gql(
      SeedGrantItemDocument,
      {
        input: {
          itemTypeId: myoTicket.id,
          userId: member.userId,
          quantity: 2,
          reason: "Event prize",
        },
      },
    );

    // An edit kit for the whole species: no variants listed, which must cover
    // Rare and a character with no variant set at all.
    const { createItemType: editKit } = await asQuartermaster.gql(
      SeedCreateItemTypeDocument,
      {
        input: {
          communityId: community.id,
          name: "Thornwing Edit Kit",
          category: "Redeemable",
          isTradeable: true,
          isConsumable: true,
        },
      },
    );

    await asQuartermaster.gql(SeedSetItemTypeTraitEditGrantDocument, {
      input: {
        itemTypeId: editKit.id,
        species: [{ speciesId: species.id, speciesVariantIds: [] }],
      },
    });

    // Two: one to spend, one still in hand afterwards.
    const { grantItem: editKitItems } = await asQuartermaster.gql(
      SeedGrantItemDocument,
      {
        input: {
          itemTypeId: editKit.id,
          userId: member.userId,
          quantity: 2,
          reason: "Event prize",
        },
      },
    );

    // The same thing narrowed to one variant. Its whole job is to be refused
    // on a character the species-wide kit accepts.
    const { createItemType: commonOnlyEditKit } = await asQuartermaster.gql(
      SeedCreateItemTypeDocument,
      {
        input: {
          communityId: community.id,
          name: "Common Thornwing Edit Kit",
          category: "Redeemable",
          isTradeable: true,
          isConsumable: true,
        },
      },
    );

    await asQuartermaster.gql(SeedSetItemTypeTraitEditGrantDocument, {
      input: {
        itemTypeId: commonOnlyEditKit.id,
        species: [{ speciesId: species.id, speciesVariantIds: [common.id] }],
      },
    });

    const { grantItem: commonOnlyKitItems } = await asQuartermaster.gql(
      SeedGrantItemDocument,
      {
        input: {
          itemTypeId: commonOnlyEditKit.id,
          userId: member.userId,
          quantity: 1,
          reason: "Event prize",
        },
      },
    );

    // ==================== Variant change items ====================

    // The shape a community actually sells: spendable on the two tiers below
    // the one it grants, and on nothing else.
    const { createItemType: rareUpgrade } = await asQuartermaster.gql(
      SeedCreateItemTypeDocument,
      {
        input: {
          communityId: community.id,
          name: "Rare Thornwing Upgrade",
          category: "Redeemable",
          isTradeable: true,
          isConsumable: true,
        },
      },
    );

    await asQuartermaster.gql(SeedSetItemTypeVariantChangeGrantDocument, {
      input: {
        itemTypeId: rareUpgrade.id,
        toVariantId: rare.id,
        fromVariantIds: [common.id, uncommon.id],
      },
    });

    // Two: one to spend, one still in hand afterwards.
    const { grantItem: rareUpgradeItems } = await asQuartermaster.gql(
      SeedGrantItemDocument,
      {
        input: {
          itemTypeId: rareUpgrade.id,
          userId: member.userId,
          quantity: 2,
          reason: "Event prize",
        },
      },
    );

    // The other reading of the source list: empty, so it covers every variant
    // of the species *and* a character with none set. Its destination is
    // Legendary, whose enum settings permit Amber alone -- so redeeming it on
    // a blue-eyed character is the case where a value is stranded and has to
    // be re-picked. That pairing is the whole reason this one exists.
    const { createItemType: legendaryAscension } = await asQuartermaster.gql(
      SeedCreateItemTypeDocument,
      {
        input: {
          communityId: community.id,
          name: "Thornwing Ascension",
          category: "Redeemable",
          isTradeable: true,
          isConsumable: true,
        },
      },
    );

    await asQuartermaster.gql(SeedSetItemTypeVariantChangeGrantDocument, {
      input: {
        itemTypeId: legendaryAscension.id,
        toVariantId: legendary.id,
        fromVariantIds: [],
      },
    });

    const { grantItem: legendaryAscensionItems } = await asQuartermaster.gql(
      SeedGrantItemDocument,
      {
        input: {
          itemTypeId: legendaryAscension.id,
          userId: member.userId,
          quantity: 2,
          reason: "Event prize",
        },
      },
    );

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
        slug: community.slug,
        url: communityUrl(community.slug),
        ledgerUrl: communityUrl(community.slug, "/items/ledger"),
      },
      currencies: {
        coin: { id: coin.id, code: coin.code, name: coin.name },
        token: { id: token.id, code: token.code, name: token.name },
        retired: { id: retired.id, code: retired.code, name: retired.name },
        bound: { id: bound.id, code: bound.code, name: bound.name },
      },
      species: { id: species.id, name: species.name },
      variants: { common, uncommon, rare, legendary },
      characters: {
        bramblefoot,
        hearthstone,
        marrowfen,
        pinefall,
        emberwake,
        ashglass,
        // Bramblefoot and Hearthstone, plus the filler. Marrowfen is
        // othermember's.
        // Bramblefoot and Hearthstone, plus the three variant-bearing ones.
        memberTotal: FILLER_COUNT + 5,
      },
      balances: { member: 380, othermember: 620 },
      currencyUrls: {
        admin: communityUrl(community.slug, "/currencies"),
        ledger: communityUrl(community.slug, "/currencies/ledger"),
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
        url: communityUrl(community.slug, "/shop"),
      },
      itemTypes: {
        potion: { id: potion.id, name: potion.name },
        locket: { id: locket.id, name: locket.name },
        ticket: { id: ticket.id, name: ticket.name, payout: 250 },
        blankTicket: { id: blankTicket.id, name: blankTicket.name },
        myoTicket: { id: myoTicket.id, name: myoTicket.name },
        editKit: { id: editKit.id, name: editKit.name },
        rareUpgrade: { id: rareUpgrade.id, name: rareUpgrade.name },
        legendaryAscension: {
          id: legendaryAscension.id,
          name: legendaryAscension.name,
        },
        commonOnlyEditKit: {
          id: commonOnlyEditKit.id,
          name: commonOnlyEditKit.name,
        },
      },
      usableItems: {
        ticketIds: ticketItems.map((i) => i.id),
        blankTicketId: blankTicketItems[0].id,
      },
      myoItems: { ticketIds: myoItems.map((i) => i.id) },
      editKitItems: {
        kitIds: editKitItems.map((i) => i.id),
        commonOnlyKitId: commonOnlyKitItems[0].id,
      },
      variantChangeItems: {
        rareUpgradeIds: rareUpgradeItems.map((i) => i.id),
        ascensionIds: legendaryAscensionItems.map((i) => i.id),
      },
      traits: { eyeColor: { id: eyeColor.id, values: eyeColorValues } },
      grantedItems: { ids: grantItem.map((i) => i.id) },
      totalCirculation:
        grantItem.length +
        IMPORT_COUNT +
        ticketItems.length +
        blankTicketItems.length +
        myoItems.length +
        editKitItems.length +
        commonOnlyKitItems.length +
        rareUpgradeItems.length +
        legendaryAscensionItems.length,
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
