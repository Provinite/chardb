import { presetTest, expect, openMenuItem } from "../../src/fixtures.js";
import type { Page } from "@playwright/test";

const test = presetTest("community-basic");

const strip = (page: Page) => page.getByTestId("character-actions");

test.describe("moderator with canDeleteCharacter", () => {
  test.use({ persona: "moderator" });

  test("sees Edit on the page and the staff actions behind the menu", async ({
    page,
    world,
  }) => {
    await page.goto(world.characters.plain.url);

    await expect(
      strip(page).getByRole("button", { name: "Edit Character" }),
    ).toBeVisible();
    // Not on the page itself: one deliberate step away (#430).
    await expect(
      page.getByRole("button", { name: "Delete Character" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Remove from Species" }),
    ).toHaveCount(0);

    await expect(
      await openMenuItem(page, "character-actions-menu", "Remove from Species"),
    ).toBeVisible();
    const group = page.getByRole("group", { name: "Staff actions" });
    await expect(
      group.getByRole("menuitem", { name: "Remove from Species" }),
    ).toBeVisible();
    await expect(
      group.getByRole("menuitem", { name: "Delete Character" }),
    ).toBeVisible();
  });
});

test.describe("plain member", () => {
  test.use({ persona: "member" });

  test("sees no actions on someone else's character", async ({
    page,
    world,
  }) => {
    // Owned by `othermember`. This distinction matters -- see the next test.
    await page.goto(world.characters.plain.url);

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: world.characters.plain.name,
      }),
    ).toBeVisible();
    await expect(strip(page)).toHaveCount(0);
  });

  test("sees Edit and only owner actions on their own character", async ({
    page,
    world,
  }) => {
    // Pins a genuine subtlety: the Member role has canEditOwnCharacter, so an
    // owner DOES see the action strip. What they must never see is the staff
    // actions. Written explicitly so nobody "simplifies" the hidden-strip test
    // onto an owned character.
    await page.goto(world.characters.pending.url);

    await expect(
      strip(page).getByRole("button", { name: "Edit Character" }),
    ).toBeVisible();
    await expect(
      await openMenuItem(page, "character-actions-menu", "Give to Community"),
    ).toBeVisible();
    await expect(
      page.getByRole("group", { name: "Staff actions" }),
    ).toHaveCount(0);
    // The strip used to be labelled "Admin", over the owner's own button.
    await expect(strip(page)).not.toContainText("Admin");
  });
});

test.describe("anonymous visitor", () => {
  test.use({ persona: "anon" });

  test("sees no actions at all", async ({ page, world }) => {
    await page.goto(world.characters.plain.url);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: world.characters.plain.name,
      }),
    ).toBeVisible();
    await expect(strip(page)).toHaveCount(0);
  });
});
