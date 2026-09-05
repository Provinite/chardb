import { presetTest, expect } from "../../src/fixtures.js";

const test = presetTest("community-basic");
test.use({ persona: "member" });

test("opens a character from the list", async ({ page, world }) => {
  const character = world.characters.pending;

  // The browse list is the site's, at the apex; the character it links to
  // belongs to a community and is served from that community's host, so the
  // card's href is an absolute URL and clicking it changes origin.
  await page.goto("/characters");
  await page.locator(`a[href="${character.url}"]`).click();

  await expect(page).toHaveURL(character.url);
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
