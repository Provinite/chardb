import { presetTest, expect, acceptNextDialog } from "../../src/fixtures.js";
import type { Page } from "@playwright/test";
import {
  SeedCreateCharacterDocument,
  SeedTraitReviewQueueDocument,
} from "../../src/generated/graphql.js";
import type { CommunityBasicWorld } from "../../src/world/presets/community-basic.js";
import type { World } from "../../src/world/types.js";

const test = presetTest("community-basic");
test.use({ persona: "moderator" });

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

test.describe("sending an entry to the back", () => {
  /**
   * The queue is FIFO, so proving a reorder needs two entries. A non-empty
   * traitValues on creation is what mints a PENDING CREATION review, same as
   * the preset's own fixture -- this one just arrives second.
   */
  const seedSecondPending = async (world: World<CommunityBasicWorld>) => {
    const { createCharacter } = await world
      .as("member")
      .gql(SeedCreateCharacterDocument, {
        input: {
          name: "Duskvane",
          speciesId: world.species.id,
          speciesVariantId: world.species.variantId,
          traitValues: [{ traitId: world.traits.eyeColor.id, value: "Blue" }],
        },
      });
    return createCharacter;
  };

  const deferFirstCard = async (page: Page, note?: string) => {
    await cards(page)
      .first()
      .getByRole("button", { name: "Send to back" })
      .click();

    // Scoped to the modal: its confirm button carries the same label as the
    // card buttons behind the overlay, and those are unclickable while it is
    // open.
    const modal = page.getByTestId("defer-modal");
    await expect(modal).toBeVisible();
    if (note) {
      await modal.getByRole("textbox").fill(note);
    }
    await modal.getByRole("button", { name: "Send to back" }).click();

    // The modal closes only after the mutation and the refetch have both
    // settled, which makes it the signal to wait on. The toast is not: two
    // defers in a row can leave two identical ones on screen.
    await expect(modal).toBeHidden();
  };

  test("moves the entry behind the ones that can be worked on", async ({
    page,
    world,
  }) => {
    const second = await seedSecondPending(world);
    const first = world.characters.pending;

    await page.goto(`${world.community.url}/moderation/traits`);
    await expect(cards(page)).toHaveCount(2);
    await expect(cards(page).nth(0)).toHaveAttribute(
      "data-character-id",
      first.id,
    );

    await deferFirstCard(page, "waiting on the owner");

    // Still two entries: deferring resolves nothing, it only reorders.
    await expect(cards(page)).toHaveCount(2);
    await expect(cards(page).nth(0)).toHaveAttribute(
      "data-character-id",
      second.id,
    );
    await expect(cards(page).nth(1)).toHaveAttribute(
      "data-character-id",
      first.id,
    );
  });

  test("shows the count and the note on the deferred card", async ({
    page,
    world,
  }) => {
    await seedSecondPending(world);
    const first = world.characters.pending;

    await page.goto(`${world.community.url}/moderation/traits`);
    await deferFirstCard(page, "waiting on the owner");

    // Exact, because the queue's own help text now contains the same phrase.
    await expect(
      page.getByText("Sent to the back of the queue", { exact: true }),
    ).toBeVisible();

    const card = cardFor(page, first.id);
    await expect(card.getByTestId("deferral-badge")).toHaveText("Deferred ×1");
    await expect(card.getByTestId("deferral-detail")).toContainText(
      "waiting on the owner",
    );
  });

  test("leaves the review pending and the count on the badge", async ({
    page,
    world,
  }) => {
    await seedSecondPending(world);

    await page.goto(`${world.community.url}/moderation/traits`);
    await deferFirstCard(page);

    // The header count is of PENDING reviews, and deferring decides nothing,
    // so it must not move.
    await expect(page.getByText("2 pending")).toBeVisible();

    const { traitReviewQueue } = await world
      .as("commadmin")
      .gql(SeedTraitReviewQueueDocument, {
        communityId: world.community.id,
        first: 10,
        offset: 0,
      });
    const deferred = traitReviewQueue.items.find(
      (item) => item.review.characterId === world.characters.pending.id,
    );
    expect(deferred?.review.status).toBe("PENDING");
    expect(deferred?.review.deferralCount).toBe(1);
    // No note was typed, so nothing is attributed to this moderator.
    expect(deferred?.review.deferralNote).toBeNull();
  });

  test("a second defer lands behind the first", async ({ page, world }) => {
    const second = await seedSecondPending(world);
    const first = world.characters.pending;

    await page.goto(`${world.community.url}/moderation/traits`);

    // Defer the head twice over: first Mossbrand, then Duskvane, which has
    // risen to the head in the meantime. Order should end up unchanged
    // relative to each other rather than ping-ponging.
    await deferFirstCard(page);
    await deferFirstCard(page);

    await expect(cards(page).nth(0)).toHaveAttribute(
      "data-character-id",
      first.id,
    );
    await expect(cards(page).nth(1)).toHaveAttribute(
      "data-character-id",
      second.id,
    );
  });
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
