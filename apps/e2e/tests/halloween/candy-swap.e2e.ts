import { presetTest, expect } from "../../src/fixtures.js";

const test = presetTest("candy-swap");

test.describe("the candy swap", () => {
  test.use({ persona: "bob" });

  test.beforeEach(async ({ page, world }) => {
    // Each test trades, so each starts from the preset's candies.
    await world.reset();
    await page.goto(`${world.community.url}/halloween/swap`);
    await expect(
      page.getByRole("heading", { name: "Candy swap", level: 1 }),
    ).toBeVisible();
  });

  test("takes an offer, and names whom it was with afterwards", async ({
    page,
  }) => {
    const offers = page.getByRole("region", { name: "Offers you can take" });
    await expect(offers.getByRole("img", { name: "berry tart" })).toBeVisible();
    // Whose it is shows only once it is traded.
    await expect(offers.getByText("alice")).toHaveCount(0);

    await offers.getByRole("button", { name: "Trade your banana" }).click();

    const trades = page.getByRole("region", { name: "Your trades" });
    await expect(trades.getByText("alice")).toBeVisible();
    await expect(trades.getByRole("img", { name: "berry tart" })).toBeVisible();
    await expect(
      offers.getByText("No offers you can take right now."),
    ).toBeVisible();
  });

  test("places an offer, holds the candy, and cancels it", async ({ page }) => {
    const form = page.getByRole("region", { name: "Make an offer" });
    await form.getByRole("button", { name: "Add banana (2 left)" }).click();
    await form
      .getByRole("button", { name: "Choose a candy to ask for" })
      .click();
    await page
      .getByRole("dialog", { name: "Ask for a candy" })
      .getByRole("button", { name: "luther head", exact: true })
      .click();
    await form.getByRole("button", { name: "Place offer" }).click();

    const mine = page.getByRole("region", { name: "Your open offers" });
    const cancel = mine.getByRole("button", {
      name: "Cancel offer for luther head",
    });
    await expect(cancel).toBeVisible();
    await expect(
      form.getByRole("button", { name: "Add banana (1 left)" }),
    ).toBeVisible();

    await cancel.click();

    await expect(mine.getByText("You have no open offers.")).toBeVisible();
    await expect(
      form.getByRole("button", { name: "Add banana (2 left)" }),
    ).toBeVisible();
  });
});
