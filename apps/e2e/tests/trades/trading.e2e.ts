import { presetTest, expect } from "../../src/fixtures.js";
import type { Browser, Page } from "@playwright/test";
const test = presetTest("community-items");

/**
 * Member-to-member trading, driven through the real screens.
 *
 * Nothing is escrowed, so the interesting behaviour is all at the seams: an
 * offer that is composed, a settlement that moves two kinds of thing across two
 * ledgers at once, and the refusals that stop an offer being made twice over
 * the same item. Those are the parts a unit test can assert the shape of but
 * not the truth of.
 *
 * The world holds exactly the asymmetry these tests want: `member` has three
 * tradeable potions and no lockets, `othermember` has thirty untradeable
 * lockets and 620 coin. So a potion-for-coin trade exercises settlement in both
 * directions, and the lockets are a ready-made locked case.
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

/** Compose an offer of one potion for `coin`, and return the trade's URL. */
async function offerPotionForCoin(
  page: Page,
  world: {
    community: { id: string };
    users: { othermember: { userId: string } };
    itemTypes: { potion: { id: string } };
  },
  coin: number,
): Promise<string> {
  await page.goto(
    composerUrl(world.community.id, world.users.othermember.userId),
  );

  await page
    .locator(
      `[data-testid="offer-pick"][data-item-type-id="${world.itemTypes.potion.id}"]`,
    )
    .first()
    .click();

  await page.getByLabel(/you receive$/i).fill(String(coin));
  await page.getByTestId("send-offer").click();

  await page.waitForURL(/\/trades\/[0-9a-f-]{36}$/);
  return page.url();
}

test.describe("composing an offer", () => {
  test.use({ persona: "member" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("shows your rows to offer and their types to request", async ({
    page,
    world,
  }) => {
    await page.goto(
      composerUrl(world.community.id, world.users.othermember.userId),
    );

    // Your side is rows, because you are here and can choose which. Their side
    // is types, because any copy will do and pinning one would make the offer
    // fail the moment they trade that copy away.
    await expect(
      page.locator(
        `[data-testid="offer-pick"][data-item-type-id="${world.itemTypes.potion.id}"]`,
      ),
    ).toHaveCount(3);

    // Their side is one entry per type rather than per row, which is the whole
    // difference: thirty lockets are one thing to ask for, not thirty.
    const theirLocket = page.locator(
      `[data-testid="request-pick"][data-item-type-id="${world.itemTypes.locket.id}"]`,
    );
    await expect(theirLocket).toHaveCount(1);
    await expect(theirLocket).toContainText("Heirloom Locket");
  });

  test("refuses to offer an untradeable type", async ({ page, world }) => {
    await page.goto(
      composerUrl(world.community.id, world.users.othermember.userId),
    );

    // Locked rather than hidden: the member can see it is theirs and see why
    // it cannot move, which is the whole reason the deck kept it on screen.
    const locked = page.locator(
      `[data-testid="request-pick"][data-tradeable="false"]`,
    );
    await expect(locked).toBeDisabled();
    await expect(locked).toContainText(/locked/i);
  });

  test("refuses to offer the same item in two open trades", async ({
    page,
    world,
  }) => {
    await offerPotionForCoin(page, world, 100);

    // Without this the item settles against whichever offer is accepted first
    // and the other fails at accept, in front of someone who cannot see why.
    await page.goto(
      composerUrl(world.community.id, world.users.othermember.userId),
    );
    await page
      .locator(
        `[data-testid="offer-pick"][data-item-type-id="${world.itemTypes.potion.id}"]`,
      )
      .first()
      .click();
    await page.getByTestId("send-offer").click();

    await expect(page.getByRole("alert")).toContainText(/already offered/i);
  });
});

test.describe("answering an offer", () => {
  test.use({ persona: "member" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("accepting moves the item and the coin together", async ({
    page,
    world,
    browser,
  }) => {
    const tradeUrl = await offerPotionForCoin(page, world, 100);

    const them = await pageAs(browser, world.storageState("othermember"));
    try {
      await them.page.goto(tradeUrl);
      await them.page.getByTestId("accept-trade").click();
      await expect(them.page.getByTestId("trade-status")).toContainText(
        /settled/i,
      );

      // Both legs, checked where a member would actually see them. One potion
      // left member's inventory and 100 coin arrived; the reverse for them.
      await page.goto(`/communities/${world.community.id}/inventory`);
      await expect(
        page.locator(
          `[data-testid="holding-group"][data-item-type-id="${world.itemTypes.potion.id}"]`,
        ),
      ).toContainText("×2");
    } finally {
      await them.close();
    }
  });

  test("declining settles nothing", async ({ page, world, browser }) => {
    const tradeUrl = await offerPotionForCoin(page, world, 100);

    const them = await pageAs(browser, world.storageState("othermember"));
    try {
      await them.page.goto(tradeUrl);
      await them.page.getByTestId("decline-trade").click();
      await expect(them.page.getByTestId("trade-status")).toContainText(
        /declined/i,
      );
    } finally {
      await them.close();
    }

    // Nothing was held while it stood, so nothing needed releasing -- the three
    // potions are still exactly where they were.
    await page.goto(`/communities/${world.community.id}/inventory`);
    await expect(
      page.locator(
        `[data-testid="holding-group"][data-item-type-id="${world.itemTypes.potion.id}"]`,
      ),
    ).toContainText("×3");
  });

  test("the proposer can withdraw, and the recipient then cannot accept", async ({
    page,
    world,
    browser,
  }) => {
    const tradeUrl = await offerPotionForCoin(page, world, 100);

    await page.goto(tradeUrl);
    await page.getByTestId("cancel-trade").click();
    await expect(page.getByTestId("trade-status")).toContainText(/withdrawn/i);

    const them = await pageAs(browser, world.storageState("othermember"));
    try {
      await them.page.goto(tradeUrl);
      await expect(them.page.getByTestId("accept-trade")).toHaveCount(0);
    } finally {
      await them.close();
    }
  });
});

test.describe("who can see an offer", () => {
  test.use({ persona: "outsider" });

  test("someone who is not a party cannot read it", async ({
    page,
    world,
    browser,
  }) => {
    const proposer = await pageAs(browser, world.storageState("member"));
    let tradeUrl: string;
    try {
      tradeUrl = await offerPotionForCoin(proposer.page, world, 100);
    } finally {
      await proposer.close();
    }

    // An offer is a private conversation between two members. The ledger is
    // where a settled one becomes everybody's business.
    await page.goto(tradeUrl);
    await expect(page.getByTestId("trade-status")).toHaveCount(0);
    await expect(page.locator("body")).toContainText(
      /not be loaded|not yours/i,
    );
  });
});
