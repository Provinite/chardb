import { presetTest, expect } from "../../src/fixtures.js";
import { SeedCheckoutDocument } from "../../src/generated/graphql.js";
import type { CommunityItemsWorld } from "../../src/world/presets/community-items.js";
import type { World } from "../../src/world/types.js";

const test = presetTest("community-items");

/**
 * A buyer's own purchase history.
 *
 * The reported bug: "buying 10 items, then 10 more only allows you to refund
 * the latest 10, no way to access the prior 10". The shop's sidebar panel is
 * the only view a buyer had, and it silently showed the eight most recent --
 * so past eight, purchases were not merely unrefundable but invisible, and a
 * member could not tell "the window closed" from "it is gone" (#289).
 *
 * Everything here buys through the real checkout rather than seeding rows, so
 * the lines carry the same shape the page reads back.
 */
test.describe("purchase history", () => {
  test.use({ persona: "member" });

  /** Buy `count` of the uncapped listing, one line each. */
  const buy = async (world: World<CommunityItemsWorld>, count: number) => {
    for (let i = 0; i < count; i++) {
      await world.as("member").gql(SeedCheckoutDocument, {
        input: {
          communityId: world.community.id,
          lines: [
            {
              shopItemId: world.shop.bulkListing.id,
              shopPriceId: world.shop.bulkListing.priceIds[0],
              quantity: 1,
            },
          ],
        },
      });
    }
  };

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("the shop panel says how much it is not showing", async ({
    page,
    world,
  }) => {
    await buy(world, 12);
    await page.goto(world.shop.url);

    // Eight rows and an honest footer, rather than eight rows and silence.
    const panel = page.getByTestId("shop-purchases");
    await expect(panel.locator('[data-testid^="purchase-"]')).toHaveCount(8);
    await expect(page.getByTestId("shop-purchases-more")).toContainText(
      "Showing 8 of 12",
    );
  });

  test("the history page reaches every purchase", async ({ page, world }) => {
    await buy(world, 12);

    await page.goto(world.shop.url);
    await page.getByTestId("shop-purchases-more").getByRole("link").click();
    await expect(page).toHaveURL(/\/shop\/purchases$/);

    // All twelve, not the eight the panel had room for. This is the report.
    await expect(page.getByTestId("my-purchases-count")).toContainText(
      "Showing 12 of 12",
    );
    await expect(
      page
        .getByTestId("my-purchases-list")
        .locator('[data-testid^="my-purchase-"]'),
    ).toHaveCount(12);
  });

  test("a purchase past the panel's eight can still be undone", async ({
    page,
    world,
  }) => {
    await buy(world, 12);
    await page.goto(`${world.community.url}/shop/purchases`);

    // The oldest is the one the panel never showed, and it is still inside
    // the fifteen-minute window, so it must be actionable rather than merely
    // visible -- being able to see it and not act on it is the same bug.
    const rows = page
      .getByTestId("my-purchases-list")
      .locator('[data-testid^="my-purchase-"]');
    const oldest = rows.last();
    await oldest.getByRole("button", { name: /undo/i }).click();

    // Undo asks first now (#296). The dialog names the purchase, because the
    // rows on this page look alike.
    await expect(page.getByTestId("my-undo-dialog")).toBeVisible();
    await page.getByTestId("confirm-accept").click();

    await expect(page.getByTestId("my-purchases-count")).toContainText(
      "Showing 12 of 12",
    );
    await expect(rows.last()).toContainText(/refunded/i);
  });

  test("undo can be backed out of, and nothing is refunded", async ({
    page,
    world,
  }) => {
    await buy(world, 2);
    await page.goto(`${world.community.url}/shop/purchases`);

    const rows = page
      .getByTestId("my-purchases-list")
      .locator('[data-testid^="my-purchase-"]');
    await rows.last().getByRole("button", { name: /undo/i }).click();
    await page.getByTestId("confirm-cancel").click();

    // The point of the gate: backing out has to leave the purchase alone.
    // A dialog that dismissed but refunded anyway would be worse than none.
    await expect(page.getByTestId("my-undo-dialog")).toHaveCount(0);
    await expect(rows.last()).not.toContainText(/refunded/i);
    await expect(
      rows.last().getByRole("button", { name: /undo/i }),
    ).toBeVisible();
  });

  test("searching and filtering narrow the whole history, not the page", async ({
    page,
    world,
  }) => {
    await buy(world, 12);
    await page.goto(`${world.community.url}/shop/purchases`);

    await page.getByTestId("purchase-search").fill("Practice");
    await expect(page.getByTestId("my-purchases-count")).toContainText("of 12");

    await page.getByTestId("purchase-search").fill("nothing called this");
    await expect(page.getByTestId("my-purchases-empty")).toBeVisible();

    // Refunded is a stored state, so the filter is answerable from the
    // database rather than from whichever rows happen to be loaded.
    await page.getByTestId("purchase-search").fill("");
    await page.getByTestId("status-chip-Refunded").click();
    await expect(page.getByTestId("my-purchases-empty")).toBeVisible();
  });
});
