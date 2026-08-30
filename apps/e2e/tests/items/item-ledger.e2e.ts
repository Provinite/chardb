import { presetTest, expect } from "../../src/fixtures.js";
import type { Page } from "@playwright/test";

const test = presetTest("community-items");

/**
 * The seeded grant carries both note fields. Every visibility assertion below
 * reads off that one row.
 */
const PUBLIC_REASON = "Lanternfall prompt completion";
const STAFF_NOTE = "Bumped from 1 after the tier table turned out ambiguous";

/** The ledger row for the seeded grant, located by its item type name. */
const grantRow = (page: Page) =>
  page.getByRole("row").filter({ hasText: "Trait Change Potion" });

test.describe("as a member with no item permissions", () => {
  test.use({ persona: "member" });

  test("can read the ledger and see the seeded grant", async ({
    page,
    world,
  }) => {
    await page.goto(world.community.ledgerUrl);

    await expect(
      page.getByRole("heading", { level: 1, name: "Item Ledger" }),
    ).toBeVisible();
    // The subtitle pins that we are on the right community's ledger, not just
    // on a page that rendered. Scoped to the subtitle because the community
    // name also appears in the sidebar switcher.
    await expect(
      page.getByText(`Every item movement in ${world.community.name}`),
    ).toBeVisible();

    const row = grantRow(page);
    await expect(row).toHaveCount(1);
    await expect(row).toContainText("Granted");
    // Three items granted in one call, collapsed to one line by batch id.
    await expect(row).toContainText("+3");
    await expect(row).toContainText(world.users.member.username);
    await expect(row).toContainText(world.users.quartermaster.username);
    await expect(row).toContainText(PUBLIC_REASON);
  });

  test("does not see the staff note", async ({ page, world }) => {
    // The heart of the public-provenance decision: the row is legitimately
    // visible to this member, the note on it is not. Asserted on the whole page
    // rather than the row so a stray render anywhere else still fails.
    await page.goto(world.community.ledgerUrl);

    await expect(grantRow(page)).toContainText(PUBLIC_REASON);
    await expect(page.getByText(STAFF_NOTE)).toHaveCount(0);
  });
});

test.describe("as staff who can grant items", () => {
  test.use({ persona: "quartermaster" });

  test("sees the staff note alongside the public reason", async ({
    page,
    world,
  }) => {
    await page.goto(world.community.ledgerUrl);

    const row = grantRow(page);
    await expect(row).toContainText(PUBLIC_REASON);
    await expect(row).toContainText(STAFF_NOTE);
  });
});

test.describe("filtering", () => {
  test.use({ persona: "quartermaster" });

  test("a kind filter that excludes the row empties the table", async ({
    page,
    world,
  }) => {
    await page.goto(world.community.ledgerUrl);
    await expect(grantRow(page)).toHaveCount(1);

    // The only seeded event is a GRANT, so filtering to Revoked must clear it.
    await page.getByRole("button", { name: "Revoked" }).click();
    await expect(grantRow(page)).toHaveCount(0);
    await expect(
      page.getByText("No events match those filters."),
    ).toBeVisible();

    // Toggling the same chip off restores it -- proves the chips are a toggle
    // rather than a one-way switch.
    await page.getByRole("button", { name: "Revoked" }).click();
    await expect(grantRow(page)).toHaveCount(1);
  });

  test("a kind filter that includes the row keeps it", async ({
    page,
    world,
  }) => {
    await page.goto(world.community.ledgerUrl);

    await page.getByRole("button", { name: "Granted" }).click();
    await expect(grantRow(page)).toHaveCount(1);
    await expect(grantRow(page)).toContainText("Granted");
  });

  test("search matches the public reason", async ({ page, world }) => {
    await page.goto(world.community.ledgerUrl);

    const search = page.getByRole("searchbox", { name: "Search the ledger" });
    await search.fill("Lanternfall");
    await expect(grantRow(page)).toHaveCount(1);

    await search.fill("nothing named this");
    await expect(
      page.getByText("No events match those filters."),
    ).toBeVisible();
  });

  test("search does not match staff notes", async ({ page, world }) => {
    // A member must not be able to probe for the contents of a note they
    // cannot read, so the server deliberately leaves staffNote out of the
    // search. Asserted from a staff session, where the note IS rendered:
    // if the filter matched it, this search would return the row.
    await page.goto(world.community.ledgerUrl);
    await expect(grantRow(page)).toContainText(STAFF_NOTE);

    await page
      .getByRole("searchbox", { name: "Search the ledger" })
      .fill("ambiguous");

    await expect(
      page.getByText("No events match those filters."),
    ).toBeVisible();
  });
});

test.describe("as someone outside the community", () => {
  test.use({ persona: "outsider" });

  test("cannot read the ledger", async ({ page, world }) => {
    await page.goto(world.community.ledgerUrl);

    // Membership is the gate. The page renders its own error state rather than
    // redirecting, so assert the table never appears.
    await expect(grantRow(page)).toHaveCount(0);
    await expect(
      page.getByText("That ledger could not be loaded."),
    ).toBeVisible();
  });
});
