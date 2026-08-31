import { presetTest, expect } from "../../src/fixtures.js";
import type { Browser, Page } from "@playwright/test";
import { SeedUpdateCharacterProfileDocument } from "../../src/generated/graphql.js";
const test = presetTest("community-items");

/**
 * Trading characters, driven through the real screens.
 *
 * The interesting part is not that a character moves -- that is one conditional
 * update. It is the consent around it. `isTradeable` defaults false and the
 * owner's reason for setting it is that people ask regardless, so the tests
 * that matter are the ones about what a closed character offers: nothing, at
 * every surface, rather than something disabled that still invites the ask.
 *
 * The world holds exactly that asymmetry. `member` owns Bramblefoot (open) and
 * Hearthstone (closed); `othermember` owns Marrowfen (open). So there is an
 * open character on each side to trade, and a closed one that must stay inert.
 */

const composerUrl = (communityId: string, withUserId: string) =>
  `/communities/${communityId}/trades/new?with=${withUserId}`;

/** A second signed-in browser context, for the other side of the trade. */
async function pageAs(
  browser: Browser,
  storageState: string,
): Promise<{ page: Page; close: () => Promise<void> }> {
  const context = await browser.newContext({ storageState });
  const page = await context.newPage();
  return { page, close: () => context.close() };
}

/** Offer Bramblefoot for Marrowfen, and return the trade's URL. */
async function offerCharacterForCharacter(
  page: Page,
  world: {
    community: { id: string };
    users: { othermember: { userId: string } };
    characters: { bramblefoot: { id: string }; marrowfen: { id: string } };
  },
): Promise<string> {
  await page.goto(
    composerUrl(world.community.id, world.users.othermember.userId),
  );

  await page
    .locator(
      `[data-testid="offer-character-pick"][data-character-id="${world.characters.bramblefoot.id}"]`,
    )
    .click();
  await page
    .locator(
      `[data-testid="request-character-pick"][data-character-id="${world.characters.marrowfen.id}"]`,
    )
    .click();
  await page.getByTestId("send-offer").click();

  await page.waitForURL(/\/trades\/[0-9a-f-]{36}$/);
  return page.url();
}

test.describe("the button on a character page", () => {
  test.use({ persona: "member" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("offers a trade on someone else's open character", async ({
    page,
    world,
  }) => {
    await page.goto(world.characters.marrowfen.url);

    await page.getByTestId("propose-character-trade").click();

    // Straight into the composer with Marrowfen already on the asking side,
    // because arriving from a character page you do not own is bidding for it.
    await page.waitForURL(/\/trades\/new\?/);
    await expect(page.getByTestId("table-receive-character")).toContainText(
      "Marrowfen",
    );
  });

  test("offers nothing at all on a character that is not open to trades", async ({
    page,
    world,
  }) => {
    await page.goto(world.characters.hearthstone.url);
    // The page has actually rendered, so the absence below is an absence and
    // not a blank page agreeing with anything asked of it.
    await expect(page.getByTestId("character-owner")).toBeVisible();

    // Not disabled, not a tooltip explaining that trades are off. Both of
    // those are still an invitation to ask, which is the thing the owner
    // turned the flag off to stop.
    await expect(page.getByTestId("propose-character-trade")).toHaveCount(0);
  });

  test("offers nothing on your own character", async ({ page, world }) => {
    await page.goto(world.characters.bramblefoot.url);
    // Exact, because the trading card further down has an "Open to Trades:"
    // label as well. This is the badge, and it means the flag is on -- so the
    // button's absence below is about who is looking, not about the flag.
    await expect(
      page.getByText("Open to Trades", { exact: true }),
    ).toBeVisible();

    // The server refuses a trade with yourself, so the button would be a dead
    // end even though the character is open.
    await expect(page.getByTestId("propose-character-trade")).toHaveCount(0);
  });
});

test.describe("composing with characters", () => {
  test.use({ persona: "member" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("shows only the characters each side has opened to trades", async ({
    page,
    world,
  }) => {
    await page.goto(
      composerUrl(world.community.id, world.users.othermember.userId),
    );

    await expect(
      page.locator(`[data-testid="offer-character-pick"]`),
    ).toHaveText([/Bramblefoot/]);
    await expect(
      page.locator(`[data-testid="request-character-pick"]`),
    ).toHaveText([/Marrowfen/]);

    // Hearthstone is member's and would be on this pane on ownership alone.
    // A closed character is absent here rather than locked, unlike an
    // untradeable item type: the item is locked by staff and you would wonder
    // where it went, this is closed by you and its absence is the setting
    // doing what you set it to.
    await expect(page.getByTestId("offer-character-pick")).not.toContainText(
      "Hearthstone",
    );
  });

  test("refuses to offer the same character in two open trades", async ({
    page,
    world,
  }) => {
    await offerCharacterForCharacter(page, world);

    // There is one Bramblefoot, so every open offer naming her is a bid on the
    // same object. Without this the second fails at accept, in front of
    // someone who cannot see the first.
    await page.goto(
      composerUrl(world.community.id, world.users.othermember.userId),
    );
    await page
      .locator(
        `[data-testid="offer-character-pick"][data-character-id="${world.characters.bramblefoot.id}"]`,
      )
      .click();
    await page.getByTestId("send-offer").click();

    await expect(page.getByRole("alert")).toContainText(
      /already offered Bramblefoot/i,
    );
  });
});

test.describe("settling a character trade", () => {
  test.use({ persona: "member" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("accepting moves both characters", async ({ page, world, browser }) => {
    const tradeUrl = await offerCharacterForCharacter(page, world);

    const them = await pageAs(browser, world.storageState("othermember"));
    try {
      await them.page.goto(tradeUrl);
      await them.page.getByTestId("accept-trade").click();
      await expect(them.page.getByTestId("trade-status")).toContainText(
        /settled/i,
      );
    } finally {
      await them.close();
    }

    // Checked on the character pages themselves, which is where a member would
    // look. Ownership is the whole of what a character trade does, so asserting
    // it anywhere else would be asserting the report rather than the fact.
    await page.goto(world.characters.bramblefoot.url);
    await expect(page.getByTestId("character-owner")).toContainText(
      world.users.othermember.username,
    );

    await page.goto(world.characters.marrowfen.url);
    await expect(page.getByTestId("character-owner")).toContainText(
      world.users.member.username,
    );
  });

  test("refuses to settle a character closed to trades after the offer", async ({
    page,
    world,
    browser,
  }) => {
    const tradeUrl = await offerCharacterForCharacter(page, world);

    // The owner changes their mind while the offer sits. Nothing is escrowed,
    // so this is allowed -- and honouring the earlier answer would settle the
    // trade through a decision its owner has since reversed.
    await world.as("othermember").gql(SeedUpdateCharacterProfileDocument, {
      id: world.characters.marrowfen.id,
      input: { isTradeable: false },
    });

    const them = await pageAs(browser, world.storageState("othermember"));
    try {
      await them.page.goto(tradeUrl);
      await them.page.getByTestId("accept-trade").click();

      await expect(them.page.getByRole("alert")).toContainText(
        /Marrowfen is no longer open to trades/i,
      );
    } finally {
      await them.close();
    }

    // And nothing moved. A refusal that had already handed Bramblefoot over
    // would be worse than settling.
    await page.goto(world.characters.bramblefoot.url);
    await expect(page.getByTestId("character-owner")).toContainText(
      world.users.member.username,
    );
  });
});
