import { presetTest, expect } from "../../src/fixtures.js";

const test = presetTest("achievements");

test.describe("achievements on a member profile", () => {
  test.use({ persona: "bob" });

  test("lists what a member earned in the community", async ({
    page,
    world,
  }) => {
    await page.goto(
      `${world.community.url}/members/${world.users.alice.username}`,
    );

    const section = page.getByTestId("member-achievements");
    await expect(
      section.getByRole("heading", { name: "Achievements" }),
    ).toBeVisible();
    const item = section.getByRole("listitem");
    await expect(item.getByText("Trick-or-Treater 2026")).toBeVisible();
    await expect(
      item.getByText("Signed in during Trick-or-Treat 2026."),
    ).toBeVisible();
  });

  test("shows no achievements section for a member with none", async ({
    page,
    world,
  }) => {
    await page.goto(
      `${world.community.url}/members/${world.users.bob.username}`,
    );
    await expect(page.getByTestId("member-inventory-link")).toBeVisible();
    await expect(page.getByTestId("member-achievements")).toHaveCount(0);
  });

  test("leaves achievements off the site profile", async ({ page, world }) => {
    await page.goto(
      `${world.community.url}/members/${world.users.alice.username}`,
    );
    await expect(page.getByTestId("member-achievements")).toBeVisible();

    await page.getByRole("link", { name: "Site profile" }).click();
    await expect(
      page.getByRole("heading", { name: `@${world.users.alice.username}` }),
    ).toBeVisible();
    await expect(page.getByText("Trick-or-Treater 2026")).toHaveCount(0);
  });
});
