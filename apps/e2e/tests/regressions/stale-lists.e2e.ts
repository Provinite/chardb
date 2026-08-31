import { presetTest, expect } from "../../src/fixtures.js";
import type { Page } from "@playwright/test";
import {
  SeedCreateItemTypeDocument,
  SeedCreateCurrencyDocument,
  SeedCreateCommunityMemberDocument,
  SeedCreateSpeciesDocument,
} from "../../src/generated/graphql.js";

/**
 * Lists that went stale until the browser was refreshed.
 *
 * Apollo's default fetchPolicy is `cache-first`, which serves the cache and
 * never revalidates. A page whose own mutations refetch looks correct to
 * whoever is editing it, and only goes wrong when the data changes somewhere
 * else -- another admin, a second tab, or anything created before this tab's
 * session began. Refreshing the browser "fixed" it only because that discards
 * the cache.
 *
 * Every test here MUST navigate by clicking, never with `page.goto`. A goto is
 * a full page load, which builds a new Apollo client with an empty cache and
 * so cannot reproduce the bug at all.
 */

const test = presetTest("community-items");
test.use({ persona: "quartermaster" });

test.beforeEach(async ({ world }) => {
  await world.reset();
});

/** Client-side navigation, the way a person moves around the app. */
async function clickTo(page: Page, href: string) {
  await page.locator(`a[href$="${href}"]`).first().click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
}

test("the item types page picks up a type created elsewhere", async ({
  page,
  world,
}) => {
  await page.goto(world.community.url);
  await clickTo(page, "/admin/items");
  // Warm the cache: whatever is here now is what cache-first would keep
  // serving for the rest of the session.
  await expect(page.getByText(world.itemTypes.potion.name)).toBeVisible();

  await world.as("quartermaster").gql(SeedCreateItemTypeDocument, {
    input: {
      communityId: world.community.id,
      name: "Tidecaller Shell",
      isTradeable: true,
      isConsumable: false,
    },
  });

  await clickTo(page, "/admin/shop");
  await clickTo(page, "/admin/items");

  await expect(page.getByText("Tidecaller Shell")).toBeVisible();
});

test("the shop listing form offers an item type created elsewhere", async ({
  page,
  world,
}) => {
  // The shop admin page reads the same catalogue to populate the item type
  // picker, so a stale copy means a brand new item type cannot be sold.
  await page.goto(world.community.url);
  await clickTo(page, "/admin/shop");
  await expect(page.getByRole("button", { name: "New listing" })).toBeVisible();

  await world.as("quartermaster").gql(SeedCreateItemTypeDocument, {
    input: {
      communityId: world.community.id,
      name: "Tidecaller Shell",
      isTradeable: true,
      isConsumable: false,
    },
  });

  // Via a page that queries neither item types nor currencies. Routing
  // through /admin/items would revalidate the shared cache entry and the shop
  // page would look fixed without being fixed.
  await clickTo(page, "/members");
  await clickTo(page, "/admin/shop");

  await page.getByRole("button", { name: "New listing" }).click();
  await expect(page.getByRole("combobox", { name: /Item type/ })).toContainText(
    "Tidecaller Shell",
  );
});

test("the shop listing form offers a currency created elsewhere", async ({
  page,
  world,
}) => {
  await page.goto(world.community.url);
  await clickTo(page, "/admin/shop");
  await expect(page.getByRole("button", { name: "New listing" })).toBeVisible();

  await world.as("quartermaster").gql(SeedCreateCurrencyDocument, {
    input: {
      communityId: world.community.id,
      name: "Tidecaller Mark",
      code: "TCM",
    },
  });

  // Via a page that queries neither item types nor currencies. Routing
  // through /admin/items would revalidate the shared cache entry and the shop
  // page would look fixed without being fixed.
  await clickTo(page, "/members");
  await clickTo(page, "/admin/shop");

  await page.getByRole("button", { name: "New listing" }).click();
  await expect(page.getByRole("combobox", { name: "Currency" })).toContainText(
    "Tidecaller Mark",
  );
});

test("the members page picks up somebody who joined elsewhere", async ({
  page,
  world,
}) => {
  await page.goto(world.community.url);
  await clickTo(page, "/members");
  await expect(
    page.getByText(world.users.member.username, { exact: false }).first(),
  ).toBeVisible();

  // `outsider` belongs to no community until now -- the join happens the way
  // it really does, somewhere other than this tab.
  await world.as("siteadmin").gql(SeedCreateCommunityMemberDocument, {
    createCommunityMemberInput: {
      userId: world.users.outsider.userId,
      roleId: world.roles.member,
    },
  });

  await clickTo(page, "/admin/items");
  await clickTo(page, "/members");

  await expect(
    page.getByText(world.users.outsider.username, { exact: false }).first(),
  ).toBeVisible();
});

test("the species page picks up a species created elsewhere", async ({
  page,
  world,
}) => {
  await page.goto(world.community.url);
  await clickTo(page, "/species");
  // Warms the cache even when the list is empty: an empty answer is cached
  // just as firmly as a full one.
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await world.as("commadmin").gql(SeedCreateSpeciesDocument, {
    createSpeciesInput: {
      communityId: world.community.id,
      name: "Tidecaller",
    },
  });

  // Back via history rather than the sidebar: the species link lives in a
  // collapsible group that is not reliably open from other pages. A history
  // navigation is still client-side -- it does not reload the document, so
  // the Apollo cache survives, which is the whole point.
  await clickTo(page, "/members");
  await page.goBack();
  await expect(page).toHaveURL(/\/species$/);

  await expect(page.getByText("Tidecaller")).toBeVisible();
});

test("the currencies page picks up a currency created elsewhere", async ({
  page,
  world,
}) => {
  await page.goto(world.community.url);
  await clickTo(page, "/currencies");
  await expect(page.getByText(world.currencies.coin.name)).toBeVisible();

  await world.as("quartermaster").gql(SeedCreateCurrencyDocument, {
    input: {
      communityId: world.community.id,
      name: "Tidecaller Mark",
      code: "TCM",
    },
  });

  await clickTo(page, "/members");
  await clickTo(page, "/currencies");

  await expect(page.getByText("Tidecaller Mark")).toBeVisible();
});
