import { presetTest, expect } from "../../src/fixtures.js";
import type { Page } from "@playwright/test";
import {
  ItemTransactionKind,
  SeedItemProvenanceDocument,
} from "../../src/generated/graphql.js";

const test = presetTest("community-items");

/**
 * One page, three audiences.
 *
 * Inventories are public within a community, so a member looking at themselves,
 * someone sizing up a trade partner, and staff about to correct something all
 * see the same facts. Permissions add actions; they never change what is shown.
 */

const ownUrl = (communityId: string) => `/communities/${communityId}/inventory`;

const memberUrl = (communityId: string, username: string) =>
  `/communities/${communityId}/members/${username}/items`;

const group = (page: Page, itemTypeId: string) =>
  page.locator(
    `[data-testid="holding-group"][data-item-type-id="${itemTypeId}"]`,
  );

test.describe("viewing your own inventory", () => {
  test.use({ persona: "member" });

  test("groups items by type with a count", async ({ page, world }) => {
    await page.goto(ownUrl(world.community.id));

    await expect(
      page.getByRole("heading", { level: 1, name: "Your Inventory" }),
    ).toBeVisible();

    const potion = group(page, world.itemTypes.potion.id);
    await expect(potion).toContainText("Trait Change Potion");
    await expect(potion).toContainText("×3");
  });

  test("offers no revoke controls on your own items", async ({
    page,
    world,
  }) => {
    // `member` has no item permissions, and this is their own inventory --
    // neither reason to show a revoke applies.
    await page.goto(ownUrl(world.community.id));

    const potion = group(page, world.itemTypes.potion.id);
    await potion.getByTestId("expand-group").click();

    await expect(page.getByRole("checkbox")).toHaveCount(0);
    await expect(page.getByTestId("selection-bar")).toHaveCount(0);
  });
});

test.describe("a holding larger than the old page size", () => {
  test.use({ persona: "member" });

  test("shows every item, not the first twenty", async ({ page, world }) => {
    // The bug this page replaces: User.inventories took the default limit of
    // 20 and reported the truncated length as the total, so a holder of 30
    // saw 20 and was told that was all of them. `othermember` holds the
    // preset's 30 imported lockets.
    expect(world.importedItems.count).toBeGreaterThan(20);

    await page.goto(
      memberUrl(world.community.id, world.users.othermember.username),
    );

    const lockets = group(page, world.itemTypes.locket.id);
    await expect(lockets).toContainText(`×${world.importedItems.count}`);

    await lockets.getByTestId("expand-group").click();
    await expect(lockets.getByTestId("holding-item")).toHaveCount(
      world.importedItems.count,
    );
  });

  test("each item links to its own history", async ({ page, world }) => {
    await page.goto(ownUrl(world.community.id));

    const potion = group(page, world.itemTypes.potion.id);
    await potion.getByTestId("expand-group").click();

    const first = potion.getByTestId("holding-item").first();
    await expect(first.getByRole("link")).toHaveAttribute(
      "href",
      new RegExp(`/communities/${world.community.id}/items/`),
    );
  });
});

test.describe("viewing another member", () => {
  test.use({ persona: "othermember" });

  test("shows the same facts about someone else", async ({ page, world }) => {
    // Public within the community: this is what makes a trade partner's
    // inventory checkable before offering.
    await page.goto(memberUrl(world.community.id, world.users.member.username));

    await expect(
      page.getByRole("heading", { level: 1, name: /Items$/ }),
    ).toContainText(world.users.member.username);
    await expect(group(page, world.itemTypes.potion.id)).toContainText("×3");
  });

  test("offers no revoke without the permission", async ({ page, world }) => {
    await page.goto(memberUrl(world.community.id, world.users.member.username));

    const potion = group(page, world.itemTypes.potion.id);
    await potion.getByTestId("expand-group").click();
    await expect(page.getByRole("checkbox")).toHaveCount(0);
  });
});

test.describe("staff revoking from a member's page", () => {
  test.use({ persona: "quartermaster" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("can revoke selected items, naming which ones", async ({
    page,
    world,
  }) => {
    await page.goto(memberUrl(world.community.id, world.users.member.username));

    const potion = group(page, world.itemTypes.potion.id);
    await potion.getByTestId("expand-group").click();

    // Two of three: the whole reason items are individually addressable.
    const boxes = potion.getByRole("checkbox");
    await boxes.nth(0).check();
    await boxes.nth(1).check();

    await expect(page.getByTestId("selection-bar")).toContainText(
      "2 items selected",
    );
    await page.getByTestId("revoke-selected").click();
    await page
      .getByLabel("Reason (shown to members)")
      .fill("Duplicate payout corrected");
    await page.getByTestId("confirm-revoke").click();

    await expect(group(page, world.itemTypes.potion.id)).toContainText("×1", {
      timeout: 15_000,
    });
  });

  test("the revoked items keep their history", async ({ page, world }) => {
    await page.goto(memberUrl(world.community.id, world.users.member.username));

    const potion = group(page, world.itemTypes.potion.id);
    await potion.getByTestId("expand-group").click();
    await potion.getByRole("checkbox").first().check();
    await page.getByTestId("revoke-selected").click();
    await page.getByLabel("Reason (shown to members)").fill("Taken back");
    await page.getByTestId("confirm-revoke").click();

    await expect(group(page, world.itemTypes.potion.id)).toContainText("×2", {
      timeout: 15_000,
    });

    // Soft delete: whichever item was selected left the inventory, but its
    // story survives. Checked across all three because the checkbox order is
    // the page's, not the seed's.
    const kinds = await Promise.all(
      world.grantedItems.ids.map(async (id) => {
        const { itemProvenance } = await world
          .as("member")
          .gql(SeedItemProvenanceDocument, { itemId: id });
        return itemProvenance.map((t) => t.kind);
      }),
    );
    expect(
      kinds.filter((k) => k.includes(ItemTransactionKind.Revoke)),
    ).toHaveLength(1);
  });

  test("the confirm button needs a reason", async ({ page, world }) => {
    await page.goto(memberUrl(world.community.id, world.users.member.username));

    const potion = group(page, world.itemTypes.potion.id);
    await potion.getByTestId("expand-group").click();
    await potion.getByRole("checkbox").first().check();
    await page.getByTestId("revoke-selected").click();

    await expect(page.getByTestId("confirm-revoke")).toBeDisabled();
    await page.getByLabel("Reason (shown to members)").fill("Returned");
    await expect(page.getByTestId("confirm-revoke")).toBeEnabled();
  });

  test("cannot revoke from their own page", async ({ page, world }) => {
    // Holding the permission does not make your own inventory a staff target.
    await page.goto(ownUrl(world.community.id));

    await expect(page.getByTestId("selection-bar")).toHaveCount(0);
  });
});

test.describe("someone outside the community", () => {
  test.use({ persona: "outsider" });

  test("cannot read a member's holdings", async ({ page, world }) => {
    await page.goto(memberUrl(world.community.id, world.users.member.username));

    await expect(page.getByText("could not be loaded")).toBeVisible();
    await expect(group(page, world.itemTypes.potion.id)).toHaveCount(0);
  });
});

test.describe("reaching holdings from the member list", () => {
  test.use({ persona: "member" });

  test("lists everyone in the community with their role", async ({
    page,
    world,
  }) => {
    await page.goto(`${world.community.url}/members`);

    await expect(
      page.getByRole("heading", { level: 1, name: "Members" }),
    ).toBeVisible();

    // The preset puts three people in the community; commadmin created it, so
    // four in total. outsider is deliberately not one of them.
    const rows = page.getByTestId("member-row");
    await expect(rows).toHaveCount(4);
    await expect(
      page.locator(
        `[data-testid="member-row"][data-username="${world.users.member.username}"]`,
      ),
    ).toContainText("Member");
    await expect(
      page.locator(
        `[data-testid="member-row"][data-username="${world.users.quartermaster.username}"]`,
      ),
    ).toContainText("Quartermaster");
  });

  test("clicking a member's Items reaches their holdings", async ({
    page,
    world,
  }) => {
    // The whole reason this page exists: before it, holdings were reachable
    // only by typing a URL.
    await page.goto(`${world.community.url}/members`);

    await page
      .locator(
        `[data-testid="member-row"][data-username="${world.users.othermember.username}"]`,
      )
      .getByRole("link", { name: /Items/ })
      .click();

    await expect(page).toHaveURL(
      new RegExp(
        `/communities/${world.community.id}/members/${world.users.othermember.username}/items$`,
      ),
    );
    await expect(group(page, world.itemTypes.locket.id)).toContainText(
      `×${world.importedItems.count}`,
    );
  });

  test("search narrows the list", async ({ page, world }) => {
    await page.goto(`${world.community.url}/members`);

    await page
      .getByRole("searchbox", { name: "Search members" })
      .fill(world.users.quartermaster.username);

    await expect(page.getByTestId("member-row")).toHaveCount(1);
  });
});
