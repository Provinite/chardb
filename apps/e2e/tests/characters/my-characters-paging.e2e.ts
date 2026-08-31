import { presetTest, expect } from "../../src/fixtures.js";
const test = presetTest("community-items");

/**
 * Paging on "My Characters".
 *
 * The bug this guards was not that the page cut the list off -- every list
 * does. It was that it cut the list off and said nothing, so a member with
 * more characters than the page size saw a screen that looked complete. The
 * assertions below are therefore mostly about the count: that it is there,
 * that it names the real total, and that it moves when you ask for more.
 *
 * `member` owns 32 characters in this world, which is more than one page.
 */

const MY_CHARACTERS = "/my/characters";
/** Must match `PAGE_SIZE` in MyCharactersPage. */
const PAGE_SIZE = 24;

test.describe("my characters", () => {
  test.use({ persona: "member" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("says how many there are, not just how many it is showing", async ({
    page,
    world,
  }) => {
    await page.goto(MY_CHARACTERS);

    // The whole bug in one assertion. Before, this page showed twenty and
    // claimed nothing; a member with more had no way to tell.
    await expect(page.getByTestId("pager-count")).toContainText(
      `of ${world.characters.memberTotal} characters`,
    );
    await expect(page.getByTestId("pager-load-more")).toBeVisible();
  });

  test("load more appends rather than replaces", async ({ page, world }) => {
    await page.goto(MY_CHARACTERS);

    const cards = page.getByTestId("character-card");
    const first = await cards.count();
    expect(first).toBeLessThan(world.characters.memberTotal);

    await page.getByTestId("pager-load-more").click();

    // Apollo replaces the cached result by default, so a Load More written
    // without an appending updateQuery swaps the page rather than growing it
    // -- which looks like the button losing your characters.
    await expect(cards).toHaveCount(world.characters.memberTotal);
    await expect(page.getByTestId("pager-count")).toContainText(
      `Showing ${world.characters.memberTotal} of ${world.characters.memberTotal}`,
    );
  });

  test("stops offering more once everything is on screen", async ({
    page,
    world,
  }) => {
    await page.goto(MY_CHARACTERS);
    await page.getByTestId("pager-load-more").click();
    await expect(page.getByTestId("character-card")).toHaveCount(
      world.characters.memberTotal,
    );

    // A button that stays after the last page is a button that asks for
    // nothing and looks broken doing it.
    await expect(page.getByTestId("pager-load-more")).toHaveCount(0);
  });

  test("asks for its own page size rather than the server's default", async ({
    page,
  }) => {
    await page.goto(MY_CHARACTERS);

    // The original bug was not a decision, it was an omission: the page sent
    // no filters at all and got `CharacterFiltersInput`'s default limit of 20.
    // Pinning the first page at the size this screen chose is what stops that
    // happening again quietly.
    await expect(page.getByTestId("character-card")).toHaveCount(PAGE_SIZE);
  });
});
