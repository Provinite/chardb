import { presetTest, expect } from "../../src/fixtures.js";
import type { Page } from "@playwright/test";
import {
  SeedCharacterDocument,
  SeedEditCharacterTraitsWithKitDocument,
} from "../../src/generated/graphql.js";

const test = presetTest("community-items");

const inventoryUrl = (communityId: string) =>
  `/communities/${communityId}/inventory`;

const adminUrl = (communityId: string) =>
  `/communities/${communityId}/admin/items`;

/** Open a holding group, which is collapsed whenever it holds more than one. */
const showItems = async (page: Page, itemTypeId: string) => {
  await page
    .locator(`[data-item-type-id="${itemTypeId}"]`)
    .getByTestId("expand-group")
    .click();
};

/** Keys off the item type id, so it asserts identity rather than presence. */
const card = (page: Page, itemTypeId: string) =>
  page.locator(
    `[data-testid="item-type-card"][data-item-type-id="${itemTypeId}"]`,
  );

/**
 * Redeeming a variant change item, through the screens.
 *
 * The API specs beside this one prove the mechanism and press no buttons. What
 * these add is the part a member actually meets: that both entry points reach
 * the page, that the confirm stands between a tap and something irreversible,
 * that a value the destination does not permit blocks the button until it is
 * re-picked, and that the move shows up on the character and on the ledger
 * without a reload.
 *
 * `member` holds two Rare Thornwing Upgrades (Common or Uncommon to Rare) and
 * two Thornwing Ascensions (anything to Legendary, which permits Amber alone).
 */
test.describe("redeeming a variant change item, through the pages", () => {
  test.use({ persona: "member" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("from the character page, through to the character being moved", async ({
    page,
    world,
  }) => {
    await page.goto(world.characters.pinefall.url);

    // Pinefall is Common, so both items apply and both are listed. Each row
    // names its own destination and redeems its own item, which is the whole
    // reason this is a list rather than a pair of buttons.
    const row = page.getByTestId(
      `usable-item-${world.itemTypes.rareUpgrade.id}`,
    );
    await expect(row).toContainText(world.itemTypes.rareUpgrade.name);
    await expect(row).toContainText(world.variants.rare.name);
    await row.getByRole("link", { name: "Redeem" }).click();

    // The row already named the item, so the page does not ask again.
    await expect(page.getByTestId("variant-change-move")).toContainText(
      world.variants.rare.name,
    );
    // Named by the community's word for it, not "upgrade ticket".
    await expect(page.getByTestId("variant-change-panel")).toContainText(
      world.itemTypes.rareUpgrade.name,
    );

    await page.getByTestId("submit-variant-change").click();
    await expect(
      page.getByTestId("redeem-variant-change-dialog"),
    ).toContainText(world.itemTypes.rareUpgrade.name);
    await page.getByTestId("confirm-accept").click();

    // Back on the character, actually Rare. Read from the API rather than off
    // the page, because the page could plausibly be showing a stale cache and
    // this is the assertion that must not be satisfiable that way.
    await expect(page).toHaveURL(
      new RegExp(`${world.characters.pinefall.id}$`),
    );
    const { character } = await world
      .as("member")
      .gql(SeedCharacterDocument, { id: world.characters.pinefall.id });
    expect(character.speciesVariantId).toBe(world.variants.rare.id);
  });

  test("cancelling the confirm redeems nothing", async ({ page, world }) => {
    await page.goto(
      `/character/${world.characters.pinefall.id}/change-variant?itemType=${world.itemTypes.rareUpgrade.id}`,
    );

    await page.getByTestId("submit-variant-change").click();
    await page.getByTestId("confirm-cancel").click();

    // A dialog that dismissed but redeemed anyway would be worse than the
    // single click it replaced.
    await expect(page.getByTestId("redeem-variant-change-dialog")).toHaveCount(
      0,
    );

    const { character } = await world
      .as("member")
      .gql(SeedCharacterDocument, { id: world.characters.pinefall.id });
    expect(character.speciesVariantId).toBe(world.variants.common.id);
  });

  test("from the inventory, through the character picker", async ({
    page,
    world,
  }) => {
    await page.goto(inventoryUrl(world.community.id));

    await showItems(page, world.itemTypes.rareUpgrade.id);
    await page
      .getByTestId(`use-item-${world.variantChangeItems.rareUpgradeIds[0]}`)
      .click();

    // Only characters it actually moves. Emberwake is already Rare and
    // Ashglass is Legendary, so neither belongs in this list.
    await expect(
      page.getByTestId(
        `variant-change-character-${world.characters.pinefall.id}`,
      ),
    ).toBeVisible();
    await expect(
      page.getByTestId(
        `variant-change-character-${world.characters.emberwake.id}`,
      ),
    ).toHaveCount(0);
    await expect(
      page.getByTestId(
        `variant-change-character-${world.characters.ashglass.id}`,
      ),
    ).toHaveCount(0);

    // And it says why one is missing rather than leaving a member to wonder.
    await expect(
      page.getByTestId("variant-change-already-there"),
    ).toContainText(world.variants.rare.name);

    await page
      .getByTestId(`variant-change-character-${world.characters.pinefall.id}`)
      .click();
    await page.getByTestId("submit-variant-change").click();
    await page.getByTestId("confirm-accept").click();

    // Wait for the redirect the mutation triggers before reading the API.
    // Without it this races the write and reads the old variant.
    await expect(page).toHaveURL(
      new RegExp(`${world.characters.pinefall.id}$`),
    );
    const { character } = await world
      .as("member")
      .gql(SeedCharacterDocument, { id: world.characters.pinefall.id });
    expect(character.speciesVariantId).toBe(world.variants.rare.id);
  });

  test("a value the destination forbids blocks the button until re-picked", async ({
    page,
    world,
  }) => {
    // Pinefall has Blue eyes; Legendary permits Amber alone. This is the case
    // the whole page exists for.
    await page.goto(
      `/character/${world.characters.pinefall.id}/change-variant?item=${world.variantChangeItems.ascensionIds[0]}`,
    );

    const reroute = page.getByTestId("variant-change-reroute");
    await expect(reroute).toContainText("Eye Color");
    await expect(reroute).toContainText("Blue");
    await expect(page.getByTestId("submit-variant-change")).toBeDisabled();

    await page
      .getByTestId(`variant-change-reroute-${world.traits.eyeColor.id}`)
      .selectOption(world.traits.eyeColor.values.amber);

    await expect(page.getByTestId("variant-change-reroute")).toHaveCount(0);
    await page.getByTestId("submit-variant-change").click();
    await page.getByTestId("confirm-accept").click();

    await expect(page).toHaveURL(
      new RegExp(`${world.characters.pinefall.id}$`),
    );
    const { character } = await world
      .as("member")
      .gql(SeedCharacterDocument, { id: world.characters.pinefall.id });
    expect(character.speciesVariantId).toBe(world.variants.legendary.id);
    expect(character.traitValues).toEqual([
      {
        traitId: world.traits.eyeColor.id,
        value: world.traits.eyeColor.values.amber,
      },
    ]);
  });

  test("nothing is offered on a character already at the destination", async ({
    page,
    world,
  }) => {
    // Emberwake is Rare. The Ascension still covers it, so the section is not
    // empty -- but the Rare upgrade has no row at all, because redeeming it
    // would move nothing.
    await page.goto(world.characters.emberwake.url);

    await expect(
      page.getByTestId(`usable-item-${world.itemTypes.legendaryAscension.id}`),
    ).toContainText(world.variants.legendary.name);
    await expect(
      page.getByTestId(`usable-item-${world.itemTypes.rareUpgrade.id}`),
    ).toHaveCount(0);
  });

  test("the item list is absent on somebody else's character", async ({
    page,
    world,
  }) => {
    // Marrowfen is othermember's, and the Ascension covers any Thornwing --
    // so this member holds an item that would work on it, and must still be
    // offered nothing. The server refuses it too; this is the half a member
    // can see.
    await page.goto(world.characters.marrowfen.url);
    await expect(page.getByTestId("character-usable-items")).toHaveCount(0);

    // Their own character proves the section renders at all, so the assertion
    // above cannot pass because the panel is broken everywhere.
    await page.goto(world.characters.pinefall.url);
    await expect(page.getByTestId("character-usable-items")).toBeVisible();
  });

  test("says nothing is offered when the character has a review pending", async ({
    page,
    world,
  }) => {
    await world.as("member").gql(SeedEditCharacterTraitsWithKitDocument, {
      input: {
        itemId: world.editKitItems.kitIds[0],
        characterId: world.characters.pinefall.id,
        traitValues: [
          {
            traitId: world.traits.eyeColor.id,
            value: world.traits.eyeColor.values.green,
          },
        ],
      },
    });

    await page.goto(
      `/character/${world.characters.pinefall.id}/change-variant?itemType=${world.itemTypes.rareUpgrade.id}`,
    );

    await expect(page.getByTestId("variant-change-unusable")).toContainText(
      /awaiting review/i,
    );
  });

  test("says what an item type does on its own page", async ({
    page,
    world,
  }) => {
    await page.goto(`/item-types/${world.itemTypes.rareUpgrade.id}`);

    const section = page.getByTestId("item-type-variant-change-grant");
    await expect(section).toContainText(world.variants.common.name);
    await expect(section).toContainText(world.variants.uncommon.name);
    await expect(section).toContainText(world.variants.rare.name);
    // The warning the other two effects do not need: this one cannot be
    // undone by a refusal, because there is no review to refuse.
    await expect(section).toContainText(/no review/i);
  });

  test("the redemption reaches the item ledger", async ({ page, world }) => {
    await page.goto(
      `/character/${world.characters.pinefall.id}/change-variant?itemType=${world.itemTypes.rareUpgrade.id}`,
    );
    await page.getByTestId("submit-variant-change").click();
    await page.getByTestId("confirm-accept").click();
    await expect(page).toHaveURL(
      new RegExp(`${world.characters.pinefall.id}$`),
    );

    await page.goto(world.community.ledgerUrl);

    // One row, naming the item by what the community called it and saying it
    // was redeemed rather than merely destroyed. Whoever changes the reason
    // string should have to change this too.
    const row = page
      .getByRole("row")
      .filter({ hasText: world.itemTypes.rareUpgrade.name })
      .filter({ hasText: "Redeemed" });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(world.users.member.username);
  });
});

/**
 * Configuring what an item moves, through the item type admin form.
 *
 * The staff half. `member` must not reach this page at all, which the item
 * permissions specs already cover; what is new here is the editor itself.
 */
test.describe("configuring a variant change, through the admin page", () => {
  test.use({ persona: "quartermaster" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("sets a destination and what it is spendable on", async ({
    page,
    world,
  }) => {
    await page.goto(adminUrl(world.community.id));

    await card(page, world.itemTypes.potion.id)
      .getByRole("button", { name: "Edit" })
      .click();

    const editor = page.getByTestId("variant-change-grant-editor");
    await editor
      .getByTestId("variant-change-grant-species")
      .selectOption(world.species.id);
    await editor
      .getByTestId("variant-change-grant-to")
      .selectOption(world.variants.rare.id);
    await editor
      .getByTestId(`variant-change-grant-from-${world.variants.common.id}`)
      .check();
    await editor.getByTestId("save-variant-change-grant").click();

    await expect(page.getByText("Variant change saved")).toBeVisible();

    await page.goto(`/item-types/${world.itemTypes.potion.id}`);
    const section = page.getByTestId("item-type-variant-change-grant");
    await expect(section).toContainText(world.variants.common.name);
    await expect(section).toContainText(world.variants.rare.name);
  });

  test("the destination cannot also be ticked as a source", async ({
    page,
    world,
  }) => {
    await page.goto(adminUrl(world.community.id));

    await card(page, world.itemTypes.potion.id)
      .getByRole("button", { name: "Edit" })
      .click();

    const editor = page.getByTestId("variant-change-grant-editor");
    await editor
      .getByTestId("variant-change-grant-species")
      .selectOption(world.species.id);
    await editor
      .getByTestId("variant-change-grant-to")
      .selectOption(world.variants.rare.id);

    // Disabled rather than hidden, so "a Rare cannot become a Rare" is
    // visible instead of discovered after saving.
    await expect(
      editor.getByTestId(`variant-change-grant-from-${world.variants.rare.id}`),
    ).toBeDisabled();
  });

  test("clearing the destination clears the grant", async ({ page, world }) => {
    await page.goto(adminUrl(world.community.id));

    await card(page, world.itemTypes.rareUpgrade.id)
      .getByRole("button", { name: "Edit" })
      .click();

    const editor = page.getByTestId("variant-change-grant-editor");
    await editor.getByTestId("variant-change-grant-to").selectOption("");
    await editor.getByTestId("save-variant-change-grant").click();

    await expect(page.getByText("Variant change cleared")).toBeVisible();

    await page.goto(`/item-types/${world.itemTypes.rareUpgrade.id}`);
    await expect(
      page.getByTestId("item-type-variant-change-grant"),
    ).toHaveCount(0);
  });

  test("refuses to sit beside a payout, and says so", async ({
    page,
    world,
  }) => {
    await page.goto(adminUrl(world.community.id));

    // The Coin Ticket already pays 250. An item type does one thing.
    await card(page, world.itemTypes.ticket.id)
      .getByRole("button", { name: "Edit" })
      .click();

    const editor = page.getByTestId("variant-change-grant-editor");
    await editor
      .getByTestId("variant-change-grant-species")
      .selectOption(world.species.id);
    await editor
      .getByTestId("variant-change-grant-to")
      .selectOption(world.variants.rare.id);
    await editor.getByTestId("save-variant-change-grant").click();

    await expect(page.getByText(/already has a payout/i)).toBeVisible();
  });

  test("a non-consumable type says why it cannot carry one", async ({
    page,
    world,
  }) => {
    await page.goto(adminUrl(world.community.id));

    // The locket is an untradeable keepsake, and not consumable.
    await card(page, world.itemTypes.locket.id)
      .getByRole("button", { name: "Edit" })
      .click();

    await expect(page.getByTestId("variant-change-grant-editor")).toContainText(
      /only a consumable item/i,
    );
  });
});
