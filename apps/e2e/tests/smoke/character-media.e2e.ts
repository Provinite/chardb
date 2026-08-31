import { presetTest, expect } from "../../src/fixtures.js";

/**
 * A character's media beyond the first pageful.
 *
 * The gallery showed one batch and offered "View All", which pointed at
 * `/character/:id/media` -- a route that did not exist, so the only way past
 * the first batch was a link to Not Found. That is issue #222: a character with
 * more media than the batch size simply could not show the rest.
 *
 * `world.characters.gallery` carries more media than the page shows at once,
 * so every assertion here is about what happens past that edge.
 */

const test = presetTest("community-basic");
test.use({ persona: "member" });

test.beforeEach(async ({ world }) => {
  await world.reset();
});

/** What the character page shows before anybody asks for more. */
const FIRST_BATCH = 8;

test("the character page shows a batch, then loads the rest", async ({
  page,
  world,
}) => {
  const character = world.characters.gallery;
  await page.goto(character.url);

  const cards = page.getByTestId("media-card");
  await expect(cards).toHaveCount(FIRST_BATCH);

  await page.getByTestId("load-more-media").click();

  await expect(cards).toHaveCount(character.mediaCount);
  // Nothing left to ask for, so the button goes.
  await expect(page.getByTestId("load-more-media")).toHaveCount(0);
});

test("View All reaches a real page holding everything", async ({
  page,
  world,
}) => {
  const character = world.characters.gallery;
  await page.goto(character.url);

  await page
    .getByRole("link", { name: new RegExp(`View All \\(${character.mediaCount}\\)`) })
    .first()
    .click();

  await expect(page).toHaveURL(new RegExp(`/character/${character.id}/media$`));
  // Would have been "Page not found" before this existed.
  await expect(page.getByTestId("character-media-page")).toBeVisible();
  await expect(page.getByTestId("media-card")).toHaveCount(
    character.mediaCount,
  );
});

test("a character within one batch offers neither control", async ({
  page,
  world,
}) => {
  // `plain` has a single media, so there is nothing more to load and nowhere
  // else to go. Asserting the absence pins that the controls are driven by
  // hasMore rather than always rendered.
  await page.goto(world.characters.plain.url);

  await expect(page.getByTestId("media-card")).toHaveCount(1);
  await expect(page.getByTestId("load-more-media")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /View All/ })).toHaveCount(0);
});
