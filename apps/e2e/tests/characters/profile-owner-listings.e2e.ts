import { presetTest, expect } from "../../src/fixtures.js";
import type { Page } from "@playwright/test";
import {
  SeedCreateCharacterDocument,
  SeedCreateGalleryDocument,
  SeedUserCharactersDocument,
  SeedUserGalleriesDocument,
  Visibility,
} from "../../src/generated/graphql.js";
import type { CommunityBasicWorld } from "../../src/world/presets/community-basic.js";
import type { World } from "../../src/world/types.js";

/**
 * "View All" on a member's profile (#321, reported twice -- also #214).
 *
 * The link wrote `/characters?owner=<username>`: a parameter nothing parses,
 * carrying a username where the filter wants a UUID. The result was the
 * unfiltered global browse -- a full, plausible grid of every character on the
 * site under someone else's name, with no indication the filter was dropped.
 * A silent wrong answer, which is why these assert *whose* characters appear
 * rather than merely that a page loaded.
 *
 * The visibility cases are here because a per-owner listing is the surface
 * where visibility actually matters. Browse mixes everyone together; this page
 * answers "what does this person have", and the answer differs by who asks.
 */

const test = presetTest("community-basic");

interface OwnerContent {
  publicChar: string;
  unlistedChar: string;
  privateChar: string;
  publicGallery: string;
  privateGallery: string;
}

/**
 * Gives `othermember` one character of each visibility and two galleries.
 * They already own `plain`, so there are two public characters in the end.
 *
 * Seeded per test rather than added to the preset: several specs assert
 * character counts, and a fixture that exists for this one should not move
 * their numbers.
 */
const seedOwnerContent = async (
  world: World<CommunityBasicWorld>,
): Promise<OwnerContent> => {
  const as = world.as("othermember");

  const character = async (name: string, visibility: Visibility) => {
    const { createCharacter } = await as.gql(SeedCreateCharacterDocument, {
      input: {
        name,
        speciesId: world.species.id,
        speciesVariantId: world.species.variantId,
        visibility,
      },
    });
    return createCharacter.id;
  };

  const gallery = async (name: string, visibility: Visibility) => {
    const { createGallery } = await as.gql(SeedCreateGalleryDocument, {
      input: { name, visibility },
    });
    return createGallery.id;
  };

  return {
    publicChar: await character("Fernhollow", Visibility.Public),
    unlistedChar: await character("Quietmoor", Visibility.Unlisted),
    privateChar: await character("Hushvale", Visibility.Private),
    publicGallery: await gallery("Fernhollow Refs", Visibility.Public),
    privateGallery: await gallery("Hushvale Drafts", Visibility.Private),
  };
};

const characterCard = (page: Page, id: string) =>
  page.locator(`[data-testid="character-card"][data-character-id="${id}"]`);

const galleryCard = (page: Page, id: string) =>
  page.locator(`[data-testid="gallery-card"][data-gallery-id="${id}"]`);

test.describe("a signed-in visitor", () => {
  test.use({ persona: "member" });

  let content: OwnerContent;

  test.beforeEach(async ({ world }) => {
    await world.reset();
    content = await seedOwnerContent(world);
  });

  test("View All reaches that member's characters, not everyone's", async ({
    page,
    world,
  }) => {
    const owner = world.users.othermember.username;
    await page.goto(`/user/${owner}`);

    await page.getByTestId("profile-view-all-characters").click();

    await expect(page).toHaveURL(new RegExp(`/user/${owner}/characters$`));
    await expect(page.getByTestId("user-characters-page")).toBeVisible();

    await expect(characterCard(page, content.publicChar)).toBeVisible();
    await expect(characterCard(page, world.characters.plain.id)).toBeVisible();

    // The bug in two assertions: `member`'s own characters were listed on
    // `othermember`'s page, because the filter was dropped entirely.
    await expect(characterCard(page, world.characters.pending.id)).toHaveCount(
      0,
    );
    await expect(characterCard(page, world.characters.gallery.id)).toHaveCount(
      0,
    );
  });

  test("the count in the link matches what the page then shows", async ({
    page,
    world,
  }) => {
    await page.goto(`/user/${world.users.othermember.username}`);

    const link = page.getByTestId("profile-view-all-characters");
    const claimed = Number((await link.textContent())?.match(/\((\d+)\)/)?.[1]);
    expect(claimed).toBeGreaterThan(0);

    await link.click();

    // A count that disagrees with the listing is the same class of lie the
    // dropped filter was: the number looks authoritative and is not.
    await expect(page.getByTestId("character-card")).toHaveCount(claimed);
  });

  test("someone else's private and unlisted characters stay off the page", async ({
    page,
    world,
  }) => {
    await page.goto(`/user/${world.users.othermember.username}/characters`);
    await expect(page.getByTestId("user-characters-page")).toBeVisible();

    await expect(characterCard(page, content.publicChar)).toBeVisible();
    await expect(characterCard(page, content.privateChar)).toHaveCount(0);
    // Unlisted means reachable by link, not listed. This page is a listing.
    await expect(characterCard(page, content.unlistedChar)).toHaveCount(0);
  });

  test("the API tells a visitor the same story the page does", async ({
    world,
  }) => {
    const { userCharacters } = await world
      .as("member")
      .gql(SeedUserCharactersDocument, {
        userId: world.users.othermember.userId,
      });

    const visibilities = userCharacters.characters.map((c) => c.visibility);
    expect(visibilities).not.toContain(Visibility.Private);
    expect(visibilities).not.toContain(Visibility.Unlisted);
  });

  test("View All for galleries reaches that member's galleries", async ({
    page,
    world,
  }) => {
    const owner = world.users.othermember.username;
    await page.goto(`/user/${owner}`);

    await page.getByTestId("profile-view-all-galleries").click();

    await expect(page).toHaveURL(new RegExp(`/user/${owner}/galleries$`));
    await expect(page.getByTestId("user-galleries-page")).toBeVisible();

    await expect(galleryCard(page, content.publicGallery)).toBeVisible();
    await expect(galleryCard(page, content.privateGallery)).toHaveCount(0);
  });
});

test.describe("the owner", () => {
  test.use({ persona: "othermember" });

  let content: OwnerContent;

  test.beforeEach(async ({ world }) => {
    await world.reset();
    content = await seedOwnerContent(world);
  });

  test("sees their own private and unlisted characters", async ({
    page,
    world,
  }) => {
    await page.goto(`/user/${world.users.othermember.username}/characters`);

    await expect(characterCard(page, content.publicChar)).toBeVisible();
    await expect(characterCard(page, content.privateChar)).toBeVisible();
    await expect(characterCard(page, content.unlistedChar)).toBeVisible();
  });

  test("sees their own private gallery", async ({ page, world }) => {
    await page.goto(`/user/${world.users.othermember.username}/galleries`);

    await expect(galleryCard(page, content.publicGallery)).toBeVisible();
    await expect(galleryCard(page, content.privateGallery)).toBeVisible();
  });
});

test.describe("a signed-out visitor", () => {
  test.use({ persona: "anon" });

  let content: OwnerContent;

  test.beforeEach(async ({ world }) => {
    await world.reset();
    content = await seedOwnerContent(world);
  });

  test("sees only public characters, and the page still loads", async ({
    page,
    world,
  }) => {
    // The query is @AllowUnauthenticated, so this must be a real page rather
    // than a login wall -- a profile is public and its listing follows.
    await page.goto(`/user/${world.users.othermember.username}/characters`);

    await expect(page.getByTestId("user-characters-page")).toBeVisible();
    await expect(characterCard(page, content.publicChar)).toBeVisible();
    await expect(characterCard(page, content.privateChar)).toHaveCount(0);
    await expect(characterCard(page, content.unlistedChar)).toHaveCount(0);
  });

  test("the API leaks neither through the anonymous path", async ({
    world,
  }) => {
    const anon = world.as("anon");

    const { userCharacters } = await anon.gql(SeedUserCharactersDocument, {
      userId: world.users.othermember.userId,
    });
    const charVis = userCharacters.characters.map((c) => c.visibility);
    expect(charVis).not.toContain(Visibility.Private);
    expect(charVis).not.toContain(Visibility.Unlisted);

    const { userGalleries } = await anon.gql(SeedUserGalleriesDocument, {
      userId: world.users.othermember.userId,
    });
    const galleryVis = userGalleries.galleries.map((g) => g.visibility);
    expect(galleryVis).toContain(Visibility.Public);
    expect(galleryVis).not.toContain(Visibility.Private);
  });
});
