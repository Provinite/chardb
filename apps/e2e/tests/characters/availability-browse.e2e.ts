import { presetTest, expect } from "../../src/fixtures.js";
import type { Page } from "@playwright/test";
const test = presetTest("community-items");

/**
 * Browsing characters by what their owners are open to.
 *
 * The whole feature is a row of checkboxes, so the thing worth driving a
 * browser for is what ticking several of them means. "Any of these" and "all
 * of these" look identical on one box and differ completely on two, and
 * getting it wrong produces an empty page rather than an error.
 *
 * The world holds three characters with three different sets: Bramblefoot is
 * open to trades, Hearthstone is a freebie and closed to trades, Marrowfen is
 * open to trades and for sale in coin.
 */

const card = (page: Page, characterId: string) =>
  page.locator(`a[href="/character/${characterId}"]`).first();

/** Open advanced search, tick these boxes, and search. */
async function filterBy(page: Page, kinds: string[]) {
  await page.goto("/characters");
  await page.getByRole("button", { name: /advanced search/i }).click();
  for (const kind of kinds) {
    await page
      .locator(
        `[data-testid="availability-filter"][data-availability="${kind}"]`,
      )
      .check();
  }
  await page.getByRole("button", { name: /search characters/i }).click();
}

test.describe("browsing by availability", () => {
  test.use({ persona: "member" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("lists every character when nothing is ticked", async ({
    page,
    world,
  }) => {
    await page.goto("/characters");

    // The baseline the filtered cases are read against. Without it a filter
    // that returned nothing would be indistinguishable from a list that was
    // empty to begin with.
    await expect(card(page, world.characters.bramblefoot.id)).toBeVisible();
    await expect(card(page, world.characters.hearthstone.id)).toBeVisible();
    await expect(card(page, world.characters.marrowfen.id)).toBeVisible();
  });

  test("one ticked box narrows to that kind", async ({ page, world }) => {
    await filterBy(page, ["FREEBIE"]);

    await expect(card(page, world.characters.hearthstone.id)).toBeVisible();
    await expect(card(page, world.characters.bramblefoot.id)).toHaveCount(0);
    await expect(card(page, world.characters.marrowfen.id)).toHaveCount(0);
  });

  test("two ticked boxes mean either, not both", async ({ page, world }) => {
    await filterBy(page, ["FREEBIE", "TRADE_CHARACTERS"]);

    // No character is both a freebie and open to trades, so an AND would
    // return an empty page here -- and an empty page reads as a broken filter
    // rather than a strict one. This is the assertion the whole shape rests on.
    await expect(card(page, world.characters.hearthstone.id)).toBeVisible();
    await expect(card(page, world.characters.bramblefoot.id)).toBeVisible();
    await expect(card(page, world.characters.marrowfen.id)).toBeVisible();
  });

  test("a filtered search is a shareable link", async ({ page, world }) => {
    await filterBy(page, ["FOR_SALE_COIN"]);
    await expect(page).toHaveURL(/availability=FOR_SALE_COIN/);

    // Landing on the link filters, and opening the panel shows which box did
    // it -- a panel that came up blank next to a filtered list would look
    // like the filter had come from nowhere.
    await page.goto("/characters?availability=FOR_SALE_COIN");
    await expect(card(page, world.characters.marrowfen.id)).toBeVisible();
    await expect(card(page, world.characters.bramblefoot.id)).toHaveCount(0);

    await page.getByRole("button", { name: /advanced search/i }).click();
    await expect(
      page.locator(
        '[data-testid="availability-filter"][data-availability="FOR_SALE_COIN"]',
      ),
    ).toBeChecked();
  });

  test("still honours the isTradeable links this replaced", async ({
    page,
    world,
  }) => {
    await page.goto("/characters?isTradeable=true");

    // The boolean the checkbox row replaced. Links and bookmarks carrying it
    // are already out there, and one that quietly stopped filtering would be
    // worse than one that broke loudly.
    await expect(card(page, world.characters.bramblefoot.id)).toBeVisible();
    await expect(card(page, world.characters.marrowfen.id)).toBeVisible();
    await expect(card(page, world.characters.hearthstone.id)).toHaveCount(0);
  });
});

test.describe("what a character page says it is open to", () => {
  test.use({ persona: "member" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("badges every kind the owner ticked, and no others", async ({
    page,
    world,
  }) => {
    await page.goto(world.characters.marrowfen.url);

    await expect(
      page.getByText("Open to Trades", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("For Sale (coin)", { exact: true }),
    ).toBeVisible();

    // Not a Yes/No list. A character open to two things should not also be
    // announcing the four it is not open to.
    await expect(page.getByText("Freebie", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Trades for Art", { exact: true })).toHaveCount(
      0,
    );
  });

  test("says nothing at all when the owner ticked nothing", async ({
    page,
    world,
  }) => {
    await page.goto(world.characters.bramblefoot.url);
    // Bramblefoot is open to trades only, so the sale and freebie rows must
    // be absent rather than present and negative.
    await expect(page.getByText("Trading Information")).toBeVisible();
    await expect(page.getByText("Freebie", { exact: true })).toHaveCount(0);
    await expect(
      page.getByText("For Sale (coin)", { exact: true }),
    ).toHaveCount(0);
  });
});
