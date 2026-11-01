import { presetTest, expect } from "../../src/fixtures.js";

const test = presetTest("halloween-prizes");

test.describe("the Halloween prize list", () => {
  test.describe("signed out", () => {
    test.use({ persona: "anon" });

    test("shows every prize and the wins, naming only linked winners", async ({
      page,
      world,
    }) => {
      await page.goto(`${world.community.url}/halloween/prizes`);

      const prizes = page.getByRole("list", { name: "Prizes" });
      const adopt = prizes
        .getByRole("listitem")
        .filter({ hasText: "Spooky Adopt" });
      await expect(adopt.getByText("1 of 2 left")).toBeVisible();
      const ghost = prizes.getByRole("listitem").filter({ hasText: "A Ghost" });
      await expect(ghost.getByText("All won")).toBeVisible();

      const wins = page.getByRole("list", { name: "Recent wins" });
      const [newest, older] = await wins.getByRole("listitem").all();
      await expect(newest.getByText("A Discord user")).toBeVisible();
      await expect(newest.getByText("5 minutes ago")).toBeVisible();
      await expect(
        older.getByRole("link", { name: world.users.carol.username }),
      ).toHaveAttribute(
        "href",
        new RegExp(`/user/${world.users.carol.username}$`),
      );
      await expect(page.getByText(world.discordWinner.username)).toHaveCount(
        0,
      );
    });
  });

  test.describe("as a member without item permissions", () => {
    test.use({ persona: "bob" });

    test("sees no Discord handles either", async ({ page, world }) => {
      await page.goto(`${world.community.url}/halloween/prizes`);

      const wins = page.getByRole("list", { name: "Recent wins" });
      await expect(wins.getByText("A Discord user")).toBeVisible();
      await expect(page.getByText(world.discordWinner.username)).toHaveCount(
        0,
      );
    });
  });

  test.describe("as the community's owner", () => {
    test.use({ persona: "alice" });

    test("sees the unlinked winner's Discord handle, linked to Discord", async ({
      page,
      world,
    }) => {
      await page.goto(`${world.community.url}/halloween/prizes`);

      const wins = page.getByRole("list", { name: "Recent wins" });
      await expect(
        wins.getByRole("link", { name: world.discordWinner.username }),
      ).toHaveAttribute(
        "href",
        `https://discord.com/users/${world.discordWinner.id}`,
      );
      await expect(wins.getByText("A Discord user")).toHaveCount(0);
    });
  });
});
