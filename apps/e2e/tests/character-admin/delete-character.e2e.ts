import { test, expect, acceptNextDialog } from "../../src/fixtures.js";
import { withClient } from "../../src/db/sql.js";
import { CFG } from "../../src/config.js";

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

  await withClient(CFG.databaseUrl, async (client) => {
    const { rows } = await client.query(
      `SELECT deleted_at, deleted_by_id FROM characters WHERE id = $1`,
      [character.id],
    );
    expect(rows, "row still present after soft delete").toHaveLength(1);
    expect(rows[0].deleted_at).not.toBeNull();
    expect(rows[0].deleted_by_id).toBe(world.users.moderator.userId);
  });
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
