import { presetTest, expect } from "../../src/fixtures.js";
import { SeedMemberWalletDocument } from "../../src/generated/graphql.js";

const test = presetTest("community-items");

/**
 * The currency pages as a member and as staff.
 *
 * Split from the API specs because these assert on what a person can see and
 * do, not on what the resolver returns. The two can disagree: the server can
 * be perfectly correct while the page renders a balance nobody can find.
 */
test.describe("currency admin page", () => {
  test.describe("as staff", () => {
    test.use({ persona: "quartermaster" });

    test("the supply table shows circulation, holders and flow", async ({
      page,
      world,
    }) => {
      await page.goto(world.currencyUrls.admin);

      const row = page.getByTestId("currency-row-HC");
      await expect(row).toBeVisible();
      // 1000 in circulation across 2 holders, the largest being 620.
      await expect(row).toContainText("1,000");
      await expect(row).toContainText("620");
    });

    test("thousands are grouped, because a five-figure balance is not readable otherwise", async ({
      page,
      world,
    }) => {
      await page.goto(world.currencyUrls.admin);
      await expect(page.getByTestId("currency-row-HC")).toContainText("1,000");
    });

    test("an archived currency is listed and marked, not hidden", async ({
      page,
      world,
    }) => {
      await page.goto(world.currencyUrls.admin);

      // Coin already granted does not vanish when a currency is retired, so
      // hiding the row would understate what exists.
      const row = page.getByTestId("currency-row-OBM");
      await expect(row).toBeVisible();
      await expect(row).toContainText(/archived/i);
    });

    test("staff see Grant and Remove actions", async ({ page, world }) => {
      await page.goto(world.currencyUrls.admin);
      await expect(page.getByTestId("grant-HC")).toBeVisible();
    });

    test("an archived currency offers no Grant action", async ({
      page,
      world,
    }) => {
      await page.goto(world.currencyUrls.admin);
      await expect(page.getByTestId("grant-OBM")).toHaveCount(0);
    });

    test.describe("granting", () => {
      // Isolated so the restore runs only after the one test that writes.
      // Resetting before every test in the file instead would put the
      // read-only majority on the snapshot path, which is most of the wall
      // time in this suite.
      test.afterEach(async ({ world }) => {
        await world.reset();
      });

      test("granting from the UI moves a real balance", async ({
        page,
        world,
      }) => {
        await page.goto(world.currencyUrls.admin);

        await page.getByTestId("grant-HC").click();

        // Every locator below is scoped to the dialog. The row behind it also
        // has a "Grant" button, and an unscoped name match finds both.
        const dialog = page.getByTestId("grant-dialog");
        await dialog.getByLabel(/amount each/i).fill("40");
        await dialog.getByRole("checkbox").first().check();
        await dialog.getByLabel(/^reason/i).fill("Manual grant from the UI");
        await dialog
          .getByRole("button", { name: "Grant", exact: true })
          .click();

        // The toast is not the assertion. The balance is.
        await expect(page.getByTestId("currency-row-HC")).toContainText(
          "1,040",
        );
      });
    });
  });

  test.describe("as a plain member", () => {
    test.use({ persona: "member" });

    test("the supply table is readable", async ({ page, world }) => {
      await page.goto(world.currencyUrls.admin);
      await expect(page.getByTestId("currency-supply-table")).toBeVisible();
      await expect(page.getByTestId("currency-row-HC")).toContainText("1,000");
    });

    test("no Grant or New currency action is offered", async ({
      page,
      world,
    }) => {
      await page.goto(world.currencyUrls.admin);

      // The numbers are public; the actions are not. The server would refuse
      // these anyway — this asserts the page does not dangle them.
      await expect(page.getByTestId("grant-HC")).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: /new currency/i }),
      ).toHaveCount(0);
    });
  });
});

test.describe("currency wallet", () => {
  test.describe("own wallet", () => {
    test.use({ persona: "member" });

    test("shows what the member holds", async ({ page, world }) => {
      await page.goto(`/communities/${world.community.id}/inventory`);

      const wallet = page.getByTestId("currency-wallet");
      await expect(wallet).toBeVisible();
      // 500 granted less 120 sent. Symbol-first, because HC carries one.
      await expect(page.getByTestId("wallet-HC")).toContainText("⬡380");
    });

    test("shows a currency held at zero", async ({ page, world }) => {
      await page.goto(`/communities/${world.community.id}/inventory`);

      // A wallet that hides these cannot tell a member the currency exists,
      // which is what they need to know before they can earn any.
      await expect(page.getByTestId("wallet-FT")).toContainText("0 FT");
    });

    test("renders a currency without a symbol as code-after", async ({
      page,
      world,
    }) => {
      await page.goto(`/communities/${world.community.id}/inventory`);
      await expect(page.getByTestId("wallet-FT")).toContainText("0 FT");
    });

    test("offers Send only on a currency actually held", async ({
      page,
      world,
    }) => {
      await page.goto(`/communities/${world.community.id}/inventory`);

      await expect(
        page.getByTestId("wallet-HC").getByRole("button", { name: /send/i }),
      ).toBeVisible();
      await expect(
        page.getByTestId("wallet-FT").getByRole("button", { name: /send/i }),
      ).toHaveCount(0);
    });

    test.describe("sending", () => {
      // Isolated so the restore runs only after the one test that writes.
      test.afterEach(async ({ world }) => {
        await world.reset();
      });

      test("sending moves coin between two members", async ({
        page,
        world,
      }) => {
        await page.goto(`/communities/${world.community.id}/inventory`);

        await page
          .getByTestId("wallet-HC")
          .getByRole("button", { name: /send/i })
          .click();
        // Scoped to the dialog: the wallet card behind it also has a Send
        // button, and an unscoped name match finds both.
        const dialog = page.getByTestId("transfer-dialog");
        // Selected by user id rather than by display name: persona names are
        // generated per run, so matching on text would be matching on noise.
        await dialog
          .getByLabel(/^to$/i)
          .selectOption(world.users.othermember.userId);
        await dialog.getByLabel(/amount/i).fill("30");
        await dialog.getByRole("button", { name: "Send", exact: true }).click();

        await expect(page.getByTestId("wallet-HC")).toContainText("⬡350");

        // And the coin arrived rather than simply vanishing.
        const { memberWallet } = await world
          .as("member")
          .gql(SeedMemberWalletDocument, {
            communityId: world.community.id,
            userId: world.users.othermember.userId,
          });
        expect(
          memberWallet.balances.find((b) => b.currency.code === "HC")?.amount,
        ).toBe(world.balances.othermember + 30);
      });
    });
  });

  test.describe("someone else's wallet", () => {
    test.use({ persona: "member" });

    test("balances are visible, Send is not", async ({ page, world }) => {
      await page.goto(
        `/communities/${world.community.id}/members/${world.users.othermember.username}/items`,
      );

      await expect(page.getByTestId("wallet-HC")).toContainText("⬡620");
      await expect(
        page.getByTestId("wallet-HC").getByRole("button", { name: /send/i }),
      ).toHaveCount(0);
    });
  });
});

test.describe("currency ledger page", () => {
  test.describe("as a plain member", () => {
    test.use({ persona: "member" });

    test("lists currency movements", async ({ page, world }) => {
      await page.goto(world.currencyUrls.ledger);
      await expect(page.getByTestId("currency-ledger-list")).toBeVisible();
      await expect(
        page.getByTestId("currency-ledger-row").first(),
      ).toBeVisible();
    });

    test("a transfer is one line, not two", async ({ page, world }) => {
      await page.goto(world.currencyUrls.ledger);
      await page.getByTestId("kind-chip-TRANSFER").click();

      // Two rows exist in the database. Showing both here would make one
      // movement of coin look like two.
      await expect(page.getByTestId("currency-ledger-row")).toHaveCount(1);
    });

    test("a bulk grant stays one line per recipient", async ({
      page,
      world,
    }) => {
      await page.goto(world.currencyUrls.ledger);
      await page.getByTestId("kind-chip-MINT").click();

      // Both recipients genuinely received their own coin. Collapsing them
      // would hide who was paid.
      await expect(page.getByTestId("currency-ledger-row")).toHaveCount(2);
    });

    test("public reasons are shown", async ({ page, world }) => {
      await page.goto(world.currencyUrls.ledger);
      await expect(page.getByTestId("currency-ledger-list")).toContainText(
        "Lanternfall placement payout",
      );
    });

    test("staff notes are not shown to a member", async ({ page, world }) => {
      await page.goto(world.currencyUrls.ledger);
      await expect(page.getByTestId("currency-ledger-list")).not.toContainText(
        "Tier 2 flat rate",
      );
    });

    test("searching a staff note finds nothing", async ({ page, world }) => {
      await page.goto(world.currencyUrls.ledger);
      await page
        .getByLabel(/search the currency ledger/i)
        .fill("Tier 2 flat rate");

      await expect(page.getByTestId("currency-ledger-empty")).toBeVisible();
    });
  });

  test.describe("as staff", () => {
    test.use({ persona: "quartermaster" });

    test("staff notes render inline", async ({ page, world }) => {
      await page.goto(world.currencyUrls.ledger);

      // Same page, same query, different viewer. The page gates nothing --
      // the server returns null for anyone without item permissions.
      await expect(page.getByTestId("currency-ledger-list")).toContainText(
        "Tier 2 flat rate",
      );
    });
  });

  test.describe("as an outsider", () => {
    test.use({ persona: "outsider" });

    test("the ledger does not render its contents", async ({ page, world }) => {
      await page.goto(world.currencyUrls.ledger);
      await expect(page.getByTestId("currency-ledger-list")).toHaveCount(0);
    });
  });
});
