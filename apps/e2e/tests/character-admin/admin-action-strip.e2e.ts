import { test, expect } from "../../src/fixtures.js";
import type { Page } from "@playwright/test";

test.use({ preset: "community-basic" });

const strip = (page: Page) => page.getByTestId("character-admin-actions");

test.describe("moderator with canDeleteCharacter", () => {
  test.use({ persona: "moderator" });

  test("sees the full admin strip", async ({ page, world }) => {
    await page.goto(world.characters.plain.url);

    await expect(strip(page)).toBeVisible();
    await expect(
      strip(page).getByRole("button", { name: "Edit Character" }),
    ).toBeVisible();
    await expect(
      strip(page).getByRole("button", { name: "Remove from Species" }),
    ).toBeVisible();
    await expect(
      strip(page).getByRole("button", { name: "Delete Character" }),
    ).toBeVisible();
  });
});

test.describe("plain member", () => {
  test.use({ persona: "member" });

  test("sees no strip on someone else's character", async ({ page, world }) => {
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

  test("sees only Edit on their own character", async ({ page, world }) => {
    // Pins a genuine subtlety: the strip renders when
    // canUserEditCharacter(...) || canDeleteCharacter || isAdmin, and the Member
    // role has canEditOwnCharacter -- so an owner DOES see the strip. What they
    // must never see is Delete or Remove from Species. Written explicitly so
    // nobody "simplifies" the hidden-strip test onto an owned character.
    await page.goto(world.characters.pending.url);

    await expect(strip(page)).toBeVisible();
    await expect(
      strip(page).getByRole("button", { name: "Edit Character" }),
    ).toBeVisible();
    await expect(
      strip(page).getByRole("button", { name: "Delete Character" }),
    ).toHaveCount(0);
    await expect(
      strip(page).getByRole("button", { name: "Remove from Species" }),
    ).toHaveCount(0);
  });
});

test.describe("anonymous visitor", () => {
  test.use({ persona: "anon" });

  test("sees no strip at all", async ({ page, world }) => {
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
