import { presetTest, expect } from "../../src/fixtures.js";
import type { Page } from "@playwright/test";
import {
  SeedCreateCharacterDocument,
  SeedCreateCharacterFolderDocument,
  SeedMoveCharactersToFolderDocument,
  SeedTransferCharacterDocument,
  SeedUserCharacterFoldersDocument,
  Visibility,
} from "../../src/generated/graphql.js";
import type { CommunityBasicWorld } from "../../src/world/presets/community-basic.js";
import type { World } from "../../src/world/types.js";

/**
 * Character folders (#350), and the community My Characters they arrive with
 * (#338).
 *
 * Two things here are worth asserting rather than assuming, because both are
 * silent when they go wrong.
 *
 * A **private folder hides its subtree**. A public folder nested inside a
 * private one has to disappear along with it, or its position describes the
 * parent its owner was hiding. Checking only the private folder itself would
 * pass against a build that leaks the child.
 *
 * A **traded character leaves its old folders**. Nothing deletes the entry
 * rows on transfer -- ownership is checked when folders are read -- so the
 * only evidence that it works is a count that falls.
 */

const test = presetTest("community-basic");

const characterCard = (page: Page, id: string) =>
  page.locator(`[data-testid="character-card"][data-character-id="${id}"]`);

const folderTile = (page: Page, name: string) =>
  page.getByRole("button", { name: new RegExp(`^${name}\\b`) });

/**
 * Three characters for `member`, so filing some of them leaves others behind
 * and the root has something to empty into.
 */
const seedCharacters = async (
  world: World<CommunityBasicWorld>,
): Promise<string[]> => {
  const as = world.as("member");

  const create = async (name: string): Promise<string> => {
    const { createCharacter } = await as.gql(SeedCreateCharacterDocument, {
      input: {
        name,
        speciesId: world.species.id,
        speciesVariantId: world.species.variantId,
        visibility: Visibility.Public,
      },
    });
    return createCharacter.id;
  };

  return [
    await create("Birchling"),
    await create("Cindermoth"),
    await create("Duskrattle"),
  ];
};

const makeFolder = async (
  world: World<CommunityBasicWorld>,
  name: string,
  options: { parentId?: string; isPrivate?: boolean } = {},
): Promise<string> => {
  const { createCharacterFolder } = await world
    .as("member")
    .gql(SeedCreateCharacterFolderDocument, {
      input: { name, ...options },
    });
  return createCharacterFolder.id;
};

const file = async (
  world: World<CommunityBasicWorld>,
  folderId: string,
  characterIds: string[],
): Promise<void> => {
  await world.as("member").gql(SeedMoveCharactersToFolderDocument, {
    input: { characterIds, toFolderId: folderId },
  });
};

test.describe("filing from the workspace", () => {
  test.use({ persona: "member" });

  let characters: string[];

  test.beforeEach(async ({ world }) => {
    await world.reset();
    characters = await seedCharacters(world);
  });

  test("a fresh workspace shows every character, because none are filed", async ({
    page,
  }) => {
    await page.goto("/my/characters");

    for (const id of characters) {
      await expect(characterCard(page, id)).toBeVisible();
    }
  });

  test("making a folder and moving characters into it empties the root", async ({
    page,
  }) => {
    await page.goto("/my/characters");

    await page.getByRole("button", { name: "New folder" }).click();
    await page
      .getByRole("textbox", { name: "New folder name" })
      .fill("Retired");
    await page.getByRole("button", { name: "Create" }).click();

    await expect(folderTile(page, "Retired")).toBeVisible();

    await page.getByRole("checkbox", { name: "Select Birchling" }).check();
    await page.getByRole("checkbox", { name: "Select Cindermoth" }).check();
    await page.getByRole("button", { name: "Move to folder" }).click();

    // Scoped to the picker: the tile behind it is also a button called
    // "Retired", and an unscoped match resolves to both.
    const picker = page.getByTestId("folder-picker");
    await picker.getByRole("button", { name: /Retired/ }).click();
    await picker.getByRole("button", { name: "Move", exact: true }).click();

    // Gone from the root: filed is the opposite of unfiled, and the root is
    // the unfiled pile.
    await expect(characterCard(page, characters[0])).toHaveCount(0);
    await expect(characterCard(page, characters[1])).toHaveCount(0);
    await expect(characterCard(page, characters[2])).toBeVisible();

    await expect(folderTile(page, "Retired")).toContainText("2");
  });

  test("opening a folder shows what is in it and a way back", async ({
    page,
    world,
  }) => {
    const folder = await makeFolder(world, "Fursonas");
    await file(world, folder, [characters[0]]);

    await page.goto("/my/characters");
    await folderTile(page, "Fursonas").click();

    await expect(page).toHaveURL(new RegExp(`folder=${folder}`));
    await expect(characterCard(page, characters[0])).toBeVisible();
    await expect(characterCard(page, characters[1])).toHaveCount(0);

    await page.getByRole("button", { name: "All characters" }).click();
    await expect(characterCard(page, characters[1])).toBeVisible();
  });

  test("a parent counts what is filed in its children", async ({
    page,
    world,
  }) => {
    const parent = await makeFolder(world, "Commissions");
    const child = await makeFolder(world, "2024", { parentId: parent });
    await file(world, child, [characters[0], characters[1]]);

    await page.goto("/my/characters");

    // Two levels up from where they are actually filed.
    await expect(folderTile(page, "Commissions")).toContainText("2");

    // ...but opening it shows the sub-folder, not the characters. Direct
    // contents only, the way a file browser works.
    await folderTile(page, "Commissions").click();
    await expect(folderTile(page, "2024")).toBeVisible();
    await expect(characterCard(page, characters[0])).toHaveCount(0);
  });

  test("a character that changes hands leaves the folders it was in", async ({
    page,
    world,
  }) => {
    const folder = await makeFolder(world, "Fursonas");
    await file(world, folder, [characters[0], characters[1]]);

    await page.goto("/my/characters");
    await expect(folderTile(page, "Fursonas")).toContainText("2");

    await world.as("member").gql(SeedTransferCharacterDocument, {
      id: characters[0],
      input: { newOwnerId: world.users.othermember.userId },
    });

    // Nothing deleted the entry row. The count falls because the folder's
    // owner no longer owns the character, which is checked on every read.
    await page.reload();
    await expect(folderTile(page, "Fursonas")).toContainText("1");

    await folderTile(page, "Fursonas").click();
    await expect(characterCard(page, characters[0])).toHaveCount(0);
    await expect(characterCard(page, characters[1])).toBeVisible();
  });

  test("deleting a folder returns its characters rather than deleting them", async ({
    page,
    world,
  }) => {
    const folder = await makeFolder(world, "Scrap");
    await file(world, folder, [characters[0]]);

    await page.goto(`/my/characters?folder=${folder}`);
    await page.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Delete folder" }).click();

    await page.goto("/my/characters");
    await expect(folderTile(page, "Scrap")).toHaveCount(0);
    await expect(characterCard(page, characters[0])).toBeVisible();
  });
});

test.describe("what a visitor sees", () => {
  let characters: string[];
  let openFolder: string;
  let secretFolder: string;
  let nestedInSecret: string;

  test.beforeEach(async ({ world }) => {
    await world.reset();
    characters = await seedCharacters(world);

    openFolder = await makeFolder(world, "Fursonas");
    secretFolder = await makeFolder(world, "To sell", { isPrivate: true });
    nestedInSecret = await makeFolder(world, "Nearly agreed", {
      parentId: secretFolder,
    });

    await file(world, openFolder, [characters[0]]);
    await file(world, secretFolder, [characters[1]]);
    await file(world, nestedInSecret, [characters[2]]);
  });

  test("a member's page shows their public folders and every character", async ({
    page,
    world,
  }) => {
    await page.goto(`/user/${world.users.member.username}/characters`);

    await expect(folderTile(page, "Fursonas")).toBeVisible();

    // A visitor's root is a listing rather than a pile to work down, so it
    // shows everything -- including the characters that are filed.
    for (const id of characters) {
      await expect(characterCard(page, id)).toBeVisible();
    }
  });

  test("a private folder and everything nested under it are absent", async ({
    page,
    world,
  }) => {
    await page.goto(`/user/${world.users.member.username}/characters`);

    await expect(folderTile(page, "To sell")).toHaveCount(0);
    // The one that matters: public, but its parent is not.
    await expect(folderTile(page, "Nearly agreed")).toHaveCount(0);
  });

  test("the API hides the private subtree too, not just the page", async ({
    world,
  }) => {
    const { userCharacterFolders } = await world
      .as("anon")
      .gql(SeedUserCharacterFoldersDocument, {
        userId: world.users.member.userId,
      });

    const names = userCharacterFolders.map((folder) => folder.name);
    expect(names).toContain("Fursonas");
    expect(names).not.toContain("To sell");
    expect(names).not.toContain("Nearly agreed");
  });

  test("a character page links its folders to the owner's listing", async ({
    page,
    world,
  }) => {
    await page.goto(world.characters.plain.url);
    // `plain` belongs to othermember and is in nothing, so the section is
    // absent entirely rather than empty.
    await expect(page.getByRole("heading", { name: "Folders" })).toHaveCount(0);
  });
});

test.describe("inside a community", () => {
  test.use({ persona: "member" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("the sidebar reaches My Characters, and the folders are the same ones", async ({
    page,
    world,
  }) => {
    const folder = await makeFolder(world, "Fursonas");
    await file(world, folder, [world.characters.pending.id]);

    await page.goto(world.community.url);
    await page.getByRole("link", { name: "My Characters" }).click();

    await expect(page).toHaveURL(/\/my-characters$/);
    await expect(folderTile(page, "Fursonas")).toBeVisible();
  });

  test("a folder holding nothing here still shows, reporting zero", async ({
    page,
    world,
  }) => {
    // Made but never filled: the point is that it does not vanish when the
    // count is narrowed to one community, or you could not file into it from
    // in here.
    await makeFolder(world, "Elsewhere");

    await page.goto(`${world.community.url}/my-characters`);

    await expect(folderTile(page, "Elsewhere")).toContainText("0");
  });
});
