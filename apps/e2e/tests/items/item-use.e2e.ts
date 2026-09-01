import { presetTest, expect } from "../../src/fixtures.js";
import type { CommunityItemsWorld } from "../../src/world/presets/community-items.js";
import type { World } from "../../src/world/types.js";
import {
  SeedUseItemDocument,
  SeedSetItemTypeUsePayoutDocument,
  SeedMemberWalletDocument,
  SeedUpdateCurrencyDocument,
} from "../../src/generated/graphql.js";
const test = presetTest("community-items");

/**
 * Using an item up for what it is worth.
 *
 * This feature creates currency, so most of what is worth testing is the ways
 * it could create more than it should: a second press, a press on somebody
 * else's item, a press on something that was never consumed. The happy path is
 * one test; the rest are about the ways the happy path could run twice.
 *
 * `member` holds two Coin Tickets worth 250 each, and one Blank Ticket that is
 * consumable but pays nothing.
 */
test.describe("using an item", () => {
  test.use({ persona: "member" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  /** `member`'s balance of the community's main coin. */
  const coinBalance = async (world: World<CommunityItemsWorld>) => {
    const { memberWallet } = await world
      .as("member")
      .gql(SeedMemberWalletDocument, {
        communityId: world.community.id,
        userId: world.users.member.userId,
      });
    return (
      memberWallet.balances.find(
        (b: { currency: { id: string } }) =>
          b.currency.id === world.currencies.coin.id,
      )?.amount ?? 0
    );
  };

  test("destroys the item and pays what it is worth", async ({ world }) => {
    const before = await coinBalance(world);

    const { useItem } = await world.as("member").gql(SeedUseItemDocument, {
      input: { itemId: world.usableItems.ticketIds[0] },
    });

    expect(useItem.payout[0].amount).toBe(world.itemTypes.ticket.payout);
    expect(await coinBalance(world)).toBe(
      before + world.itemTypes.ticket.payout,
    );
  });

  test("cannot be used twice", async ({ world }) => {
    const itemId = world.usableItems.ticketIds[0];
    await world.as("member").gql(SeedUseItemDocument, { input: { itemId } });
    const after = await coinBalance(world);

    // The whole reason the destroy is conditional and comes first. A second
    // press must pay nothing, not pay again.
    await expect(
      world.as("member").gql(SeedUseItemDocument, { input: { itemId } }),
    ).rejects.toThrow();

    expect(await coinBalance(world)).toBe(after);
  });

  test("cannot be used by somebody who does not hold it", async ({ world }) => {
    await expect(
      world.as("othermember").gql(SeedUseItemDocument, {
        input: { itemId: world.usableItems.ticketIds[0] },
      }),
    ).rejects.toThrow(/not yours/i);
  });

  test("refuses a consumable configured with nothing", async ({ world }) => {
    // Destroying the item and handing back nothing is a different failure
    // from an item that cannot be used at all, and it is worth refusing.
    await expect(
      world.as("member").gql(SeedUseItemDocument, {
        input: { itemId: world.usableItems.blankTicketId },
      }),
    ).rejects.toThrow(/does nothing/i);
  });

  test("refuses an item type that is not consumable", async ({ world }) => {
    // A locket, which othermember holds and which is not consumable. Using
    // without using up would pay every time it was pressed, so it is refused
    // before the payout is even looked at.
    await expect(
      world.as("othermember").gql(SeedUseItemDocument, {
        input: { itemId: world.importedItems.ids[0] },
      }),
    ).rejects.toThrow(/cannot be used/i);
  });

  test("refuses once the payout currency is archived", async ({ world }) => {
    await world.as("quartermaster").gql(SeedUpdateCurrencyDocument, {
      id: world.currencies.coin.id,
      input: { archived: true },
    });

    // Checked again at use rather than trusted from when staff configured it.
    // Otherwise the ticket is destroyed for coin that cannot be created.
    await expect(
      world.as("member").gql(SeedUseItemDocument, {
        input: { itemId: world.usableItems.ticketIds[0] },
      }),
    ).rejects.toThrow(/archived/i);
  });

  test("a payout cannot be set on something that is never used up", async ({
    world,
  }) => {
    // Refused where staff can see it, rather than at use in front of a member.
    await expect(
      world.as("quartermaster").gql(SeedSetItemTypeUsePayoutDocument, {
        itemTypeId: world.itemTypes.locket.id,
        components: [{ currencyId: world.currencies.coin.id, amount: 10 }],
      }),
    ).rejects.toThrow(/not consumable/i);
  });

  test("a payout cannot name an archived currency", async ({ world }) => {
    await expect(
      world.as("quartermaster").gql(SeedSetItemTypeUsePayoutDocument, {
        itemTypeId: world.itemTypes.ticket.id,
        components: [{ currencyId: world.currencies.retired.id, amount: 10 }],
      }),
    ).rejects.toThrow(/archived/i);
  });

  test("an ordinary member cannot set a payout", async ({ world }) => {
    // It is minting rights. Anyone who can set it can create currency at will.
    await expect(
      world.as("member").gql(SeedSetItemTypeUsePayoutDocument, {
        itemTypeId: world.itemTypes.ticket.id,
        components: [{ currencyId: world.currencies.coin.id, amount: 999999 }],
      }),
    ).rejects.toThrow();
  });
});
