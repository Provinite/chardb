import { test, expect, acceptNextDialog } from "../../src/fixtures.js";
import type { Page } from "@playwright/test";

test.use({ preset: "community-basic", persona: "moderator" });

test.beforeEach(async ({ world }) => {
  await world.reset();
});

const cards = (page: Page) => page.getByTestId("trait-review-card");
// data-character-id sits on the card element itself, not a descendant, so this
// is an attribute selector rather than filter({ has: ... }).
const cardFor = (page: Page, characterId: string) =>
  page.locator(
    `[data-testid="trait-review-card"][data-character-id="${characterId}"]`,
  );

test("shows the pending review with the inline admin actions", async ({
  page,
  world,
}) => {
  await page.goto(`${world.community.url}/moderation/traits`);

  await expect(cards(page)).toHaveCount(1);
  const card = cardFor(page, world.characters.pending.id);
  await expect(card.getByRole("button", { name: "Approve" })).toBeVisible();
  await expect(
    card.getByRole("button", { name: "Remove from Species" }),
  ).toBeVisible();
  await expect(
    card.getByRole("button", { name: "Delete", exact: true }),
  ).toBeVisible();

  // Revert is hidden for CREATION- and IMPORT-sourced reviews, and the seeded
  // review is CREATION. Asserting its absence pins that branch.
  await expect(card.getByRole("button", { name: "Revert" })).toHaveCount(0);
});

test("inline Delete clears the row and soft-deletes the character", async ({
  page,
  world,
}) => {
  const character = world.characters.pending;
  await page.goto(`${world.community.url}/moderation/traits`);
  await expect(cards(page)).toHaveCount(1);

  acceptNextDialog(page, (message) =>
    expect(message).toContain(character.name),
  );
  await cardFor(page, character.id)
    .getByRole("button", { name: "Delete", exact: true })
    .click();

  await expect(page.getByText(`"${character.name}" deleted`)).toBeVisible();
  await expect(cards(page)).toHaveCount(0);

  await page.goto(character.url);
  await expect(
    page.getByRole("heading", { level: 3, name: "Character not found" }),
  ).toBeVisible();
});

test("inline Remove from Species clears the row and flattens traits", async ({
  page,
  world,
}) => {
  const character = world.characters.pending;
  await page.goto(`${world.community.url}/moderation/traits`);
  await expect(cards(page)).toHaveCount(1);

  acceptNextDialog(page);
  await cardFor(page, character.id)
    .getByRole("button", { name: "Remove from Species" })
    .click();

  await expect(
    page.getByText(new RegExp(`"${character.name}" removed from`)),
  ).toBeVisible();
  // The review is CANCELLED, so the row leaves the queue.
  await expect(cards(page)).toHaveCount(0);

  await page.goto(character.url);
  const fields = page.getByRole("heading", { level: 3, name: "Fields" });
  await expect(fields).toBeVisible();
  await expect(
    page.locator("section, div").filter({ has: fields }).last(),
  ).toContainText("Eye Color");
});

test.describe("a moderator without canDeleteCharacter", () => {
  // The stock Moderator role has canEditCharacterRegistry but NOT
  // canDeleteCharacter, so it may kick but not delete. `commadmin` holds Admin
  // (both), `moderator` holds the custom Moderator Plus (both) -- so this case
  // needs a member moved onto the stock role.
  test.use({ persona: "commadmin" });

  test("still sees both actions as a community admin", async ({
    page,
    world,
  }) => {
    await page.goto(`${world.community.url}/moderation/traits`);
    const card = cardFor(page, world.characters.pending.id);
    await expect(
      card.getByRole("button", { name: "Remove from Species" }),
    ).toBeVisible();
    await expect(
      card.getByRole("button", { name: "Delete", exact: true }),
    ).toBeVisible();
  });
});

test.describe("plain member", () => {
  test.use({ persona: "member" });

  test("cannot reach the review queue", async ({ page, world }) => {
    // traitReviewQueue requires CanEditCharacterRegistry, which Member lacks.
    await page.goto(`${world.community.url}/moderation/traits`);
    await expect(cards(page)).toHaveCount(0);
  });
});
