import { presetTest, expect } from "../../src/fixtures.js";
import { SeedUpdateCharacterProfileDocument } from "../../src/generated/graphql.js";

/**
 * Watching a character (issue #590): a member hears when somebody else's
 * character changes what its owner is open to.
 *
 * Marrowfen belongs to `othermember` and Bramblefoot to `member`.
 */
const test = presetTest("community-items");
test.use({ persona: "member" });

test.beforeEach(async ({ world }) => {
  await world.reset();
});

test("a watcher is notified when the owner opens the character to offers", async ({
  page,
  world,
}) => {
  await page.goto(world.characters.marrowfen.url);
  await page.getByRole("button", { name: "Watch" }).click();
  await expect(page.getByRole("button", { name: "Watching" })).toBeVisible();

  // Survives a reload: the watch is stored, not just local state.
  await page.reload();
  await expect(page.getByRole("button", { name: "Watching" })).toBeVisible();

  await world.as("othermember").gql(SeedUpdateCharacterProfileDocument, {
    id: world.characters.marrowfen.id,
    input: { isOpenToOffers: true, isTradeable: false },
  });

  await page.goto("/notifications");
  await expect(
    page.getByText(
      "says Marrowfen is now open to offers, and no longer open to trades for other characters",
    ),
  ).toBeVisible();
});

test("an owner is not offered a watch on their own character", async ({
  page,
  world,
}) => {
  await page.goto(world.characters.bramblefoot.url);
  // Something on the page has rendered before asserting an absence.
  await expect(page.getByTestId("character-owner")).toBeVisible();
  await expect(page.getByRole("button", { name: "Watch" })).toHaveCount(0);
});
