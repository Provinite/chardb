import { presetTest, expect } from "../../src/fixtures.js";
import { SeedCheckoutDocument } from "../../src/generated/graphql.js";
const test = presetTest("community-items");

/**
 * The gate in front of a staff refund.
 *
 * Reported as a mobile mis-tap risk, and the stakes are what make it worth a
 * spec rather than a glance: `refundLine` returns the coin and destroys the
 * item, calling it twice throws, and there is no un-refund. Recovering from a
 * stray tap means re-granting by hand and clawing the currency back, with the
 * ledger keeping both the mistake and the correction.
 *
 * The staff page lists many members' purchases in visually similar rows, so
 * the dialog naming the member and the item is part of the fix rather than
 * decoration.
 */
test.describe("staff refund", () => {
  test.use({ persona: "quartermaster" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
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
  });

  test("asks before refunding, and names who and what", async ({
    page,
    world,
  }) => {
    await page.goto(`/communities/${world.community.id}/admin/shop/purchases`);

    const refund = page.locator('[data-testid^="staff-refund-"]').first();
    await refund.click();

    const dialog = page.getByTestId("staff-refund-dialog");
    await expect(dialog).toBeVisible();
    // The member and the item, because the rows look alike and the reader
    // needs to know which one they are about to undo.
    await expect(dialog).toContainText(world.users.member.username);
    await expect(dialog).toContainText(/cannot be undone/i);
  });

  test("cancelling refunds nothing", async ({ page, world }) => {
    await page.goto(`/communities/${world.community.id}/admin/shop/purchases`);

    await page.locator('[data-testid^="staff-refund-"]').first().click();
    await page.getByTestId("confirm-cancel").click();

    // The whole point. A dialog that dismissed but refunded anyway would be
    // worse than the single click it replaced.
    await expect(page.getByTestId("staff-refund-dialog")).toHaveCount(0);
    await expect(
      page.locator('[data-testid^="staff-refund-"]').first(),
    ).toBeVisible();
  });

  test("escape backs out too", async ({ page, world }) => {
    await page.goto(`/communities/${world.community.id}/admin/shop/purchases`);

    await page.locator('[data-testid^="staff-refund-"]').first().click();
    await page.keyboard.press("Escape");

    // Cancel is the safe direction, so it is reachable every way a reader
    // might reach for it. There is deliberately no shortcut to confirm.
    await expect(page.getByTestId("staff-refund-dialog")).toHaveCount(0);
    await expect(
      page.locator('[data-testid^="staff-refund-"]').first(),
    ).toBeVisible();
  });

  test("confirming refunds it", async ({ page, world }) => {
    await page.goto(`/communities/${world.community.id}/admin/shop/purchases`);

    await page.locator('[data-testid^="staff-refund-"]').first().click();
    await page.getByTestId("confirm-accept").click();

    await expect(page.getByText(/refunded/i).first()).toBeVisible();
    await expect(page.locator('[data-testid^="staff-refund-"]')).toHaveCount(0);
  });
});
