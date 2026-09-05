import { presetTest, expect } from "../../src/fixtures.js";
import type { Browser, Page } from "@playwright/test";
import { SeedUpdateItemTypeDocument } from "../../src/generated/graphql.js";
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

/** Takes the community's own origin -- `world.community.url` -- because a
 *  trade belongs to a community and is served from its host. */
const composerUrl = (communityUrl: string, withUserId: string) =>
  `${communityUrl}/trades/new?with=${withUserId}`;

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
    community: { url: string };
    users: { othermember: { userId: string } };
    itemTypes: { potion: { id: string } };
  },
  coin: number,
): Promise<string> {
  await page.goto(
    composerUrl(world.community.url, world.users.othermember.userId),
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
      composerUrl(world.community.url, world.users.othermember.userId),
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
      composerUrl(world.community.url, world.users.othermember.userId),
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
      composerUrl(world.community.url, world.users.othermember.userId),
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

  test("does not offer an untradeable currency as a price", async ({
    page,
    world,
  }) => {
    await page.goto(
      composerUrl(world.community.url, world.users.othermember.userId),
    );

    // `member` holds 40 PP, so it is in the wallet and would be in the picker
    // on balance alone. Offering it would be refused at send with a message
    // about a rule the member cannot do anything about from here.
    const picker = page.getByTestId("coin-picker");
    await expect(picker).toContainText("Hollow Coin");
    await expect(picker).not.toContainText("Prompt Points");
  });

  test("refuses to promise coin already promised elsewhere", async ({
    page,
    world,
  }) => {
    // 300 of member's 380 goes out in the first offer.
    await page.goto(
      composerUrl(world.community.url, world.users.othermember.userId),
    );
    await page.getByLabel(/hollow coin you give$/i).fill("300");
    await page.getByTestId("send-offer").click();
    await page.waitForURL(/\/trades\/[0-9a-f-]{36}$/);

    // The second cannot settle whatever the wallet says, so it is refused here
    // rather than at accept in front of someone who cannot see the first offer.
    // The balance alone would have allowed it, which is why the message has to
    // name the commitment.
    await page.goto(
      composerUrl(world.community.url, world.users.othermember.userId),
    );
    await page.getByLabel(/hollow coin you give$/i).fill("200");
    await page.getByTestId("send-offer").click();

    await expect(page.getByRole("alert")).toContainText(
      /300 of your 380 is already promised/i,
    );
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
      await page.goto(`${world.community.url}/inventory`);
      await expect(
        page.locator(
          `[data-testid="holding-group"][data-item-type-id="${world.itemTypes.potion.id}"]`,
        ),
      ).toContainText("×2");
    } finally {
      await them.close();
    }
  });

  test("refuses a type locked after the offer was written", async ({
    page,
    world,
    browser,
  }) => {
    const tradeUrl = await offerPotionForCoin(page, world, 100);

    // Nothing is held while an offer stands, so staff can lock a type in the
    // gap -- and that is usually exactly when they would, because something has
    // gone wrong with it. Compose time already refused untradeable types; if
    // accept trusts that, the offers open at the moment of the decision settle
    // straight through it.
    await world.as("quartermaster").gql(SeedUpdateItemTypeDocument, {
      id: world.itemTypes.potion.id,
      input: { isTradeable: false },
    });

    const them = await pageAs(browser, world.storageState("othermember"));
    try {
      await them.page.goto(tradeUrl);
      await them.page.getByTestId("accept-trade").click();
      await expect(them.page.getByRole("alert")).toContainText(
        /no longer be traded/i,
      );
      await expect(them.page.getByTestId("trade-status")).toContainText(
        /awaiting/i,
      );
    } finally {
      await them.close();
    }

    // Failed settlement is all-or-nothing: the coin must not have moved either.
    await page.goto(`${world.community.url}/inventory`);
    await expect(
      page.locator(
        `[data-testid="holding-group"][data-item-type-id="${world.itemTypes.potion.id}"]`,
      ),
    ).toContainText("×3");
    await expect(page.getByTestId("wallet-HC")).toContainText("380");
  });

  test("writes one ledger line per leg", async ({ page, world, browser }) => {
    const tradeUrl = await offerPotionForCoin(page, world, 100);

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

    // The ledger collapses a batch into one line, which is right for a grant
    // and wrong for a settlement: this one moves a potion out and nothing back,
    // but a trade of two item types shares a batch across both directions and
    // read as "3 × <one of the two types>" until the collapse keyed on the leg.
    await page.goto(world.community.ledgerUrl);
    const traded = page.locator('[data-testid="ledger-row"]', {
      hasText: "Trade settled",
    });
    await expect(traded).toHaveCount(1);
    await expect(traded).toContainText(world.itemTypes.potion.name);
    await expect(traded).toContainText("+1");
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
    await page.goto(`${world.community.url}/inventory`);
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

test.describe("countering an offer", () => {
  test.use({ persona: "member" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("opens the composer on the same table, ready to edit", async ({
    page,
    world,
    browser,
  }) => {
    const tradeUrl = await offerPotionForCoin(page, world, 100);
    const tradeId = tradeUrl.split("/").pop() as string;

    const them = await pageAs(browser, world.storageState("othermember"));
    try {
      await them.page.goto(tradeUrl);
      await them.page.getByTestId("counter-trade").click();
      await them.page.waitForURL(/\/trades\/new\?/);

      // The composer addresses people by id. It said `with=<username>` once,
      // which loaded nobody's inventory and left a blank table behind a decline
      // that had already gone through.
      expect(them.page.url()).toContain(`with=${world.users.member.userId}`);
      expect(them.page.url()).toContain(`mirror=${tradeId}`);

      // Swapped, not copied. The potion that was coming to them is now what
      // they ask for, and the coin they were paying is what they offer.
      await expect(
        them.page.getByRole("heading", { name: /counter-offer/i }),
      ).toBeVisible();
      await expect(them.page.getByTestId("table-receive")).toContainText(
        "Trait Change Potion",
      );
      await expect(them.page.getByLabel(/hollow coin you give$/i)).toHaveValue(
        "100",
      );
    } finally {
      await them.close();
    }

    // Opening a counter costs the offer nothing. Declining on the button press
    // meant a member who thought better of it was left with neither offer and
    // no way back to what they had been sent.
    await page.goto(tradeUrl);
    await expect(page.getByTestId("trade-status")).toContainText(/awaiting/i);
  });

  test("abandoning a counter leaves the original answerable", async ({
    page,
    world,
    browser,
  }) => {
    const tradeUrl = await offerPotionForCoin(page, world, 100);

    const them = await pageAs(browser, world.storageState("othermember"));
    try {
      await them.page.goto(tradeUrl);
      await them.page.getByTestId("counter-trade").click();
      await them.page.waitForURL(/\/trades\/new\?/);

      // Walk away from the composer, come back, and accept the original.
      await them.page.goto(tradeUrl);
      await them.page.getByTestId("accept-trade").click();
      await expect(them.page.getByTestId("trade-status")).toContainText(
        /settled/i,
      );
    } finally {
      await them.close();
    }
  });

  test("the counter can be edited before it is sent, and settles as edited", async ({
    page,
    world,
    browser,
  }) => {
    const tradeUrl = await offerPotionForCoin(page, world, 100);

    let counterUrl: string;
    const them = await pageAs(browser, world.storageState("othermember"));
    try {
      await them.page.goto(tradeUrl);
      await them.page.getByTestId("counter-trade").click();
      await them.page.waitForURL(/\/trades\/new\?/);

      // The seed is a starting point, not a fixture. Haggling 100 down to 60 is
      // the entire reason the button exists.
      await them.page.getByLabel(/hollow coin you give$/i).fill("60");
      await them.page.getByTestId("send-offer").click();
      await them.page.waitForURL(/\/trades\/[0-9a-f-]{36}$/);
      counterUrl = them.page.url();
    } finally {
      await them.close();
    }

    // Sending it is what closes the original, and the two happen together.
    await page.goto(tradeUrl);
    await expect(page.getByTestId("trade-status")).toContainText(/declined/i);

    await page.goto(counterUrl);
    await expect(page.getByTestId("offer-receive")).toContainText("60");
    await page.getByTestId("accept-trade").click();
    await expect(page.getByTestId("trade-status")).toContainText(/settled/i);

    // 60 rather than 100, and one potion gone: the edit settled, not the seed.
    await page.goto(`${world.community.url}/inventory`);
    await expect(page.getByTestId("wallet-HC")).toContainText("440");
    await expect(
      page.locator(
        `[data-testid="holding-group"][data-item-type-id="${world.itemTypes.potion.id}"]`,
      ),
    ).toContainText("×2");
  });

  test("is offered to the recipient only", async ({ page, world }) => {
    const tradeUrl = await offerPotionForCoin(page, world, 100);

    // Countering your own offer is withdrawing it and writing another, and
    // that button is already there under its own name.
    await page.goto(tradeUrl);
    await expect(page.getByTestId("counter-trade")).toHaveCount(0);
    await expect(page.getByTestId("cancel-trade")).toBeVisible();
  });
});

test.describe("who can see an offer", () => {
  test.use({ persona: "outsider" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

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
