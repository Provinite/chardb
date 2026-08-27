import { test, expect, acceptNextDialog } from "../../src/fixtures.js";
import { SeedPurgeCharacterDocument } from "../../src/generated/graphql.js";

test.use({ preset: "community-basic", persona: "moderator" });

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
  await expect(
    page.locator(`a[href="/character/${character.id}"]`),
  ).toHaveCount(0);
  // The other character is untouched -- proves the list actually rendered.
  await expect(
    page.locator(`a[href="/character/${world.characters.pending.id}"]`),
  ).toBeVisible();

  // Direct navigation is also blocked by the notDeleted filter.
  await page.goto(character.url);
  await expect(
    page.getByRole("heading", { level: 3, name: "Character not found" }),
  ).toBeVisible();
});

test("delete is a soft delete, not a purge", async ({ page, world }) => {
  const character = world.characters.plain;
  await page.goto(character.url);

  acceptNextDialog(page);
  await page
    .getByTestId("character-admin-actions")
    .getByRole("button", { name: "Delete Character" })
    .click();
  await expect(page).toHaveURL(/\/characters$/);

  // `deletedAt` is not exposed anywhere in the GraphQL schema, so soft-vs-hard
  // is not directly observable. purgeCharacter is the probe: its lookup omits
  // the notDeleted filter, so it succeeds only while the row still exists. A
  // hard delete would have made this throw "Character not found".
  const { purgeCharacter } = await world
    .as("siteadmin")
    .gql(SeedPurgeCharacterDocument, { id: character.id });
  expect(purgeCharacter).toBe(true);

  // ...and now it really is gone, which also covers purgeCharacter itself.
  await expect(
    world.as("siteadmin").gql(SeedPurgeCharacterDocument, { id: character.id }),
  ).rejects.toThrow(/Character not found/);
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
