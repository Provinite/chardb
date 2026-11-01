import { presetTest, expect } from "../../src/fixtures.js";
import { apexUrl } from "../../src/config.js";

const test = presetTest("achievements");

test.describe("achievements on a profile", () => {
  test.use({ persona: "bob" });

  test("lists what a user earned and where", async ({ page, world }) => {
    await page.goto(apexUrl(`/user/${world.users.alice.username}`));

    const section = page.getByTestId("profile-achievements");
    await expect(
      section.getByRole("heading", { name: "Achievements" }),
    ).toBeVisible();
    const item = section.getByRole("listitem");
    await expect(item.getByText("Trick-or-Treater 2026")).toBeVisible();
    await expect(
      item.getByText("Signed in during Trick-or-Treat 2026."),
    ).toBeVisible();
    await expect(item.getByText(world.community.name)).toBeVisible();
  });

  test("shows no achievements section for someone with none", async ({
    page,
    world,
  }) => {
    await page.goto(apexUrl(`/user/${world.users.bob.username}`));
    await expect(
      page.getByRole("heading", { name: `@${world.users.bob.username}` }),
    ).toBeVisible();
    await expect(page.getByTestId("profile-achievements")).toHaveCount(0);
  });
});
