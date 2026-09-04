import { presetTest, expect } from "../../src/fixtures.js";
import {
  SeedCreateGalleryDocument,
  SeedGalleryLikeStatusDocument,
  SeedCharacterLikeStatusDocument,
  Visibility,
} from "../../src/generated/graphql.js";

/**
 * Public pages, opened by somebody who is not signed in (#173).
 *
 * A public gallery rendered "Gallery not found -- Forbidden resource" to a
 * signed-out visitor. The gallery was fine and its resolver was
 * `@AllowUnauthenticated`; what failed was one field on it. `userHasLiked` was
 * gated to signed-in users, `Gallery.userHasLiked` is non-nullable, so the
 * field error propagated to the parent and nulled the whole gallery. The page
 * saw no data and fell into its not-found branch.
 *
 * Every assertion here selects or renders `userHasLiked`. A spec that left it
 * out would pass against the bug, which is precisely how it survived: the API
 * answers correctly right up until you ask for the one field.
 */

const test = presetTest("community-basic");

const GALLERY_NAME = "Wayfarer's Sketches";

test.describe("signed out", () => {
  test.use({ persona: "anon" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("a public gallery opens", async ({ page, world }) => {
    const { createGallery } = await world
      .as("member")
      .gql(SeedCreateGalleryDocument, {
        input: { name: GALLERY_NAME, visibility: Visibility.Public },
      });

    await page.goto(`/gallery/${createGallery.id}`);

    await expect(
      page.getByRole("heading", { level: 1, name: GALLERY_NAME }),
    ).toBeVisible();
    // The symptom, asserted directly: a public gallery reported as missing.
    await expect(page.getByText("Gallery not found")).toHaveCount(0);
    await expect(page.getByText("Forbidden resource")).toHaveCount(0);
  });

  test("the gallery API answers a signed-out viewer", async ({ world }) => {
    const { createGallery } = await world
      .as("member")
      .gql(SeedCreateGalleryDocument, {
        input: { name: GALLERY_NAME, visibility: Visibility.Public },
      });

    const { gallery } = await world
      .as("anon")
      .gql(SeedGalleryLikeStatusDocument, { id: createGallery.id });

    expect(gallery.name).toBe(GALLERY_NAME);
    // Not an error and not null: nobody is signed in, so nobody has liked it.
    expect(gallery.userHasLiked).toBe(false);
  });

  test("a public character opens", async ({ page, world }) => {
    // `plain` is public and owned by somebody else. This passes today only
    // because GET_CHARACTER happens not to select userHasLiked; the API case
    // below is what actually pins the field.
    await page.goto(world.characters.plain.url);

    await expect(
      page.getByRole("heading", { name: world.characters.plain.name }),
    ).toBeVisible();
    await expect(page.getByText("Forbidden resource")).toHaveCount(0);
  });

  test("the character API answers a signed-out viewer", async ({ world }) => {
    // Character.userHasLiked carried the same wrong decorator as Gallery's.
    // It broke no page only because no anonymous document selected it -- a
    // tripwire for whoever adds it to GET_CHARACTER next.
    const { character } = await world
      .as("anon")
      .gql(SeedCharacterLikeStatusDocument, {
        id: world.characters.plain.id,
      });

    expect(character.name).toBe(world.characters.plain.name);
    expect(character.userHasLiked).toBe(false);
  });
});

test.describe("signed in", () => {
  test.use({ persona: "member" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("still answers a viewer who is signed in", async ({ world }) => {
    // The fix widens who may ask; it must not change the answer for everyone
    // who could already ask.
    const { createGallery } = await world
      .as("member")
      .gql(SeedCreateGalleryDocument, {
        input: { name: GALLERY_NAME, visibility: Visibility.Public },
      });

    const { gallery } = await world
      .as("member")
      .gql(SeedGalleryLikeStatusDocument, { id: createGallery.id });

    expect(gallery.userHasLiked).toBe(false);

    const { character } = await world
      .as("member")
      .gql(SeedCharacterLikeStatusDocument, {
        id: world.characters.plain.id,
      });
    expect(character.userHasLiked).toBe(false);
  });
});
