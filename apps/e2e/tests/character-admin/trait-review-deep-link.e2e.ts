import { presetTest, expect } from "../../src/fixtures.js";
import type { Page } from "@playwright/test";
import { SeedCreateCharacterDocument } from "../../src/generated/graphql.js";
import { oneForm } from "../../src/world/forms.js";

const test = presetTest("community-basic");

test.beforeEach(async ({ world }) => {
  await world.reset();
});

const cards = (page: Page) => page.getByTestId("trait-review-card");

test.describe("moderator", () => {
  test.use({ persona: "moderator" });

  test("goes from the pending badge to that character's review alone", async ({
    page,
    world,
  }) => {
    // A second pending review, so the narrowed queue has something to leave out.
    await world.as("member").gql(SeedCreateCharacterDocument, {
      input: {
        name: "Duskvane",
        speciesId: world.species.id,
        speciesVariantId: world.species.variantId,
        forms: oneForm([{ traitId: world.traits.eyeColor.id, value: "Blue" }]),
      },
    });
    const character = world.characters.pending;

    await page.goto(character.url);
    await page.getByRole("link", { name: "Traits Pending Review" }).click();

    await expect(page).toHaveURL(
      new RegExp(`/moderation/traits\\?character=${character.id}$`),
    );
    await expect(cards(page)).toHaveCount(1);
    await expect(cards(page)).toHaveAttribute(
      "data-character-id",
      character.id,
    );

    await page.getByRole("link", { name: "Show full queue" }).click();
    await expect(cards(page)).toHaveCount(2);
  });

  test("sees the review is settled once it is approved", async ({
    page,
    world,
  }) => {
    const character = world.characters.pending;
    await page.goto(
      `${world.community.url}/moderation/traits?character=${character.id}`,
    );

    await cards(page).getByRole("button", { name: "Approve" }).click();

    await expect(cards(page)).toHaveCount(0);
    await expect(
      page.getByText("This character has no trait review waiting."),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Show full queue" }),
    ).toBeVisible();
  });
});

test.describe("plain member", () => {
  test.use({ persona: "member" });

  test("sees the pending badge on their own character, not a link", async ({
    page,
    world,
  }) => {
    await page.goto(world.characters.pending.url);

    await expect(page.getByText("Traits Pending Review")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Traits Pending Review" }),
    ).toHaveCount(0);
  });
});
