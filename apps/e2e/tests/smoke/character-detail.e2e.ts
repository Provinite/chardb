import { presetTest, expect } from "../../src/fixtures.js";

const test = presetTest("community-basic");
test.use({ persona: "member" });

test("opens a character from the list", async ({ page, world }) => {
  const character = world.characters.pending;

  await page.goto("/characters");
  await page.locator(`a[href="/character/${character.id}"]`).click();

  await expect(page).toHaveURL(new RegExp(`/character/${character.id}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: character.name }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: world.species.name }),
  ).toBeVisible();
});

test("shows the pending trait review badge", async ({ page, world }) => {
  await page.goto(world.characters.pending.url);
  await expect(page.getByText("Traits Pending Review")).toBeVisible();
});
