import { presetTest, expect } from "../../src/fixtures.js";
import type { CommunityItemsWorld } from "../../src/world/presets/community-items.js";
import type { World } from "../../src/world/types.js";
import type { Page } from "@playwright/test";
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
        input: {
          itemTypeId: world.itemTypes.locket.id,
          components: [{ currencyId: world.currencies.coin.id, amount: 10 }],
        },
      }),
    ).rejects.toThrow(/not consumable/i);
  });

  test("a payout cannot name an archived currency", async ({ world }) => {
    await expect(
      world.as("quartermaster").gql(SeedSetItemTypeUsePayoutDocument, {
        input: {
          itemTypeId: world.itemTypes.ticket.id,
          components: [{ currencyId: world.currencies.retired.id, amount: 10 }],
        },
      }),
    ).rejects.toThrow(/archived/i);
  });

  test("refuses a payout above the ceiling every other amount carries", async ({
    world,
  }) => {
    // Belt and braces: the DTO's @Max and the service check both cover this,
    // so it passes whichever fires. The test below is the one that tells them
    // apart.
    await expect(
      world.as("quartermaster").gql(SeedSetItemTypeUsePayoutDocument, {
        input: {
          itemTypeId: world.itemTypes.ticket.id,
          components: [
            { currencyId: world.currencies.coin.id, amount: 2000000000 },
          ],
        },
      }),
    ).rejects.toThrow();
  });

  test("refuses a payout of zero", async ({ world }) => {
    await expect(
      world.as("quartermaster").gql(SeedSetItemTypeUsePayoutDocument, {
        input: {
          itemTypeId: world.itemTypes.ticket.id,
          components: [{ currencyId: world.currencies.coin.id, amount: 0 }],
        },
      }),
    ).rejects.toThrow();
  });

  test("validates the components themselves, not just the wrapper", async ({
    world,
  }) => {
    // The discriminating test. `@IsUUID()` on currencyId is checked by nothing
    // but the DTO, so the message tells you which layer answered: validation
    // says "must be a UUID", while the old dead-decorator behaviour fell
    // through to the community lookup and said "names a currency from another
    // community".
    //
    // Those decorators were dead until this input was wrapped: Nest's
    // ValidationPipe skips any parameter whose metatype is Array, so
    // `@Args("components", { type: () => [Input] })` was never validated.
    const rejection = await world
      .as("quartermaster")
      .gql(SeedSetItemTypeUsePayoutDocument, {
        input: {
          itemTypeId: world.itemTypes.ticket.id,
          components: [{ currencyId: "not-a-uuid", amount: 10 }],
        },
      })
      .then(
        () => null,
        (err: Error) => err.message,
      );

    // The pipe's own throw, which is what firing looks like from out here --
    // its per-field detail lives in the error extensions, not the message.
    expect(rejection).toMatch(/bad request/i);
    // And specifically not the service's message, which is what a dead
    // decorator would have produced by letting the garbage id through to the
    // community lookup.
    expect(rejection).not.toMatch(/another community/i);
  });

  test("an ordinary member cannot set a payout", async ({ world }) => {
    // It is minting rights. Anyone who can set it can create currency at will.
    await expect(
      world.as("member").gql(SeedSetItemTypeUsePayoutDocument, {
        input: {
          itemTypeId: world.itemTypes.ticket.id,
          components: [
            { currencyId: world.currencies.coin.id, amount: 999999 },
          ],
        },
      }),
    ).rejects.toThrow();
  });
});

/**
 * The same thing through the screens a member actually uses.
 *
 * The block above proves the mechanism; none of it presses a button. These
 * cover what was added on top: that the button appears where it should and
 * nowhere else, that the confirm stands between a tap and an irreversible
 * destroy, and that both halves of the result -- the item gone, the coin
 * arrived -- are on screen afterwards without a reload.
 */
test.describe("using an item, through the page", () => {
  test.use({ persona: "member" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  const inventoryUrl = (communityId: string) =>
    `/communities/${communityId}/inventory`;

  /** Open a holding group, which is collapsed whenever it holds more than one. */
  const showItems = async (page: Page, itemTypeId: string) => {
    await page
      .locator(`[data-item-type-id="${itemTypeId}"]`)
      .getByTestId("expand-group")
      .click();
  };

  test("shows the wallet growing and the item gone", async ({
    page,
    world,
  }) => {
    await page.goto(inventoryUrl(world.community.id));

    const wallet = page.getByTestId(`wallet-${world.currencies.coin.code}`);
    await expect(wallet).toContainText(String(world.balances.member));

    // member holds two tickets, so the group is collapsed and the per-item
    // buttons are behind its disclosure. Worth noting as a UX point -- the
    // primary action on a redeemable item is two clicks away -- but this is
    // the behaviour as it stands.
    await showItems(page, world.itemTypes.ticket.id);

    const itemId = world.usableItems.ticketIds[0];
    await page.getByTestId(`use-item-${itemId}`).click();
    await expect(page.getByTestId("use-item-dialog")).toContainText(
      String(world.itemTypes.ticket.payout),
    );
    await page.getByTestId("confirm-accept").click();

    // Both halves of one event, on screen. The wallet is a separate component
    // with its own query, so this is also what proves the refetch reaches it.
    await expect(wallet).toContainText(
      String(world.balances.member + world.itemTypes.ticket.payout),
    );
    await expect(page.getByTestId(`use-item-${itemId}`)).toHaveCount(0);
  });

  test("cancelling uses nothing", async ({ page, world }) => {
    await page.goto(inventoryUrl(world.community.id));

    await showItems(page, world.itemTypes.ticket.id);

    const itemId = world.usableItems.ticketIds[0];
    await page.getByTestId(`use-item-${itemId}`).click();
    await page.getByTestId("confirm-cancel").click();

    // A dialog that dismissed but used the item anyway would be worse than
    // the single click it replaced.
    await expect(page.getByTestId("use-item-dialog")).toHaveCount(0);
    await expect(page.getByTestId(`use-item-${itemId}`)).toBeVisible();
    await expect(
      page.getByTestId(`wallet-${world.currencies.coin.code}`),
    ).toContainText(String(world.balances.member));
  });

  test("says what an item type is worth on its own page", async ({
    page,
    world,
  }) => {
    await page.goto(`/item-types/${world.itemTypes.ticket.id}`);

    // Before this the payout appeared only in the confirm dialog, which is
    // after the decision to spend rather than before it -- and useless to
    // somebody weighing up a trade for one.
    const payout = page.getByTestId("item-type-use-payout");
    await expect(payout).toContainText(String(world.itemTypes.ticket.payout));
  });

  test("says nothing about payout on a type that pays nothing", async ({
    page,
    world,
  }) => {
    await page.goto(`/item-types/${world.itemTypes.blankTicket.id}`);

    // Absent rather than showing a zero, matching the item type's actual
    // state: it has no payout, which is not the same as a payout of nothing.
    await expect(page.getByText("Properties")).toBeVisible();
    await expect(page.getByTestId("item-type-use-payout")).toHaveCount(0);
  });

  test("offers no Use on an item that pays nothing", async ({
    page,
    world,
  }) => {
    await page.goto(inventoryUrl(world.community.id));

    // The Blank Ticket is consumable but configured with nothing. Using it
    // would be refused, so the button is absent rather than present and
    // doomed -- the same rule the trade button follows.
    await expect(page.getByTestId("holdings-list")).toContainText(
      world.itemTypes.blankTicket.name,
    );
    // One of them, so its group is already open and the absence below is a
    // real absence rather than a collapsed disclosure.
    await expect(
      page.getByTestId(`use-item-${world.usableItems.blankTicketId}`),
    ).toHaveCount(0);
  });
});
