import { presetTest, expect, acceptNextDialog } from "../../src/fixtures.js";

const test = presetTest("community-basic");
test.use({ persona: "moderator" });

// Scope note: this file asserts what a user can observe -- the character stops
// appearing in browse and its page 404s. It deliberately does NOT assert that
// the delete was *soft*. There is no user-visible difference (nothing lists or
// restores deleted characters), so that is implementation, and it is already
// covered where it belongs: apps/backend/src/characters/characters.service.spec.ts
// ("softDelete should set deletedAt and cancel pending trait reviews", and
// "should purge a soft-deleted character"). Re-asserting it from a browser test
// would couple this suite to a backend storage decision it cannot see.

// Destructive: restore before every test rather than once per file (~66ms).
test.beforeEach(async ({ world }) => {
  await world.reset();
});

test("deleting a character removes it everywhere", async ({ page, world }) => {
  const character = world.characters.plain;
  await page.goto(character.url);

  acceptNextDialog(page, (message) => {
    expect(message).toContain(character.name);
  });
  await page
    .getByTestId("character-admin-actions")
    .getByRole("button", { name: "Delete Character" })
    .click();

  // handleDelete navigates to /characters on success.
  await expect(page).toHaveURL(/\/characters$/);
  // Cards link by absolute URL, because a character is served from its
  // community's host wherever the list itself is (#339).
  await expect(page.locator(`a[href="${character.url}"]`)).toHaveCount(0);
  // The other character is untouched -- proves the list actually rendered.
  await expect(
    page.locator(`a[href="${world.characters.pending.url}"]`),
  ).toBeVisible();

  // Direct navigation is also blocked by the notDeleted filter.
  await page.goto(character.url);
  await expect(
    page.getByRole("heading", { level: 3, name: "Character not found" }),
  ).toBeVisible();
});

test("cancelling the confirm leaves the character alone", async ({
  page,
  world,
}) => {
  const character = world.characters.plain;
  await page.goto(character.url);

  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .getByTestId("character-admin-actions")
    .getByRole("button", { name: "Delete Character" })
    .click();

  await expect(page).toHaveURL(new RegExp(`/character/${character.id}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: character.name }),
  ).toBeVisible();
});
