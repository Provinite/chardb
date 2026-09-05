import { presetTest, expect } from "../../src/fixtures.js";
import type { Page } from "@playwright/test";

const test = presetTest("community-basic");

/**
 * The community moderation index, and the dead link that produced it (#352).
 *
 * The admin dashboard's "Content Moderation" card pointed at a path that was
 * never a registered route, so it fell through to the catch-all NotFoundPage.
 * The same feature worked from the sidebar, which links to the queue directly
 * -- which is why the report described one entry point 404ing and another
 * working. (The paths have since lost their `/communities/:id` prefix, the
 * community being the host now; the dead-link shape is what these guard.)
 *
 * The first test here is the regression, and it navigates by clicking rather
 * than with `page.goto`: the bug was in a link, so typing its destination into
 * the address bar would prove nothing about the link.
 *
 * The rest cover the gating. The index shows a queue only to a role that can
 * work it, and its pending count comes from `pendingImageCount` /
 * `pendingTraitReviewCount`, both guarded server-side by the same permission.
 * Getting that wrong does not look broken -- it fires a query that 403s while
 * the page still renders -- so the seeded roles below are chosen to hold
 * exactly one of the two permissions each:
 *
 *   imagemod  -- canModerateImages only
 *   moderator -- canEditCharacterRegistry only (the "Moderator Plus" role)
 *   member    -- neither
 */

/**
 * A queue card on the index. Its pending count is part of the accessible
 * name, which is also what tells it apart from the sidebar link of the same
 * label.
 */
const queueCard = (page: Page, label: string, pending: number) =>
  page.getByLabel(`${label}, ${pending} pending`);

/** Either queue card, counted regardless of what its count reads. */
const anyQueueCard = (page: Page, label: string) =>
  page.getByLabel(new RegExp(`^${label}, \\d+ pending$`));

test.beforeEach(async ({ world }) => {
  await world.reset();
});

test.describe("a moderator who can only moderate images", () => {
  test.use({ persona: "imagemod" });

  test("reaches the index from the admin dashboard instead of a 404", async ({
    page,
    world,
  }) => {
    await page.goto(`${world.community.url}/admin`);

    await page
      .getByRole("link", { name: /Content Moderation/ })
      .first()
      .click();

    await expect(page).toHaveURL(`${world.community.url}/moderation`);
    await expect(page.getByText("Page Not Found")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { level: 1, name: "Content Moderation" }),
    ).toBeVisible();
  });

  test("is offered the image queue with its pending count, and not the trait queue", async ({
    page,
    world,
  }) => {
    await page.goto(`${world.community.url}/moderation`);

    // One PENDING image is seeded by the preset.
    await expect(queueCard(page, "Image Moderation", 1)).toBeVisible();
    await expect(anyQueueCard(page, "Trait Review")).toHaveCount(0);
  });

  test("the image card leads to the image queue", async ({ page, world }) => {
    await page.goto(`${world.community.url}/moderation`);
    await queueCard(page, "Image Moderation", 1).click();

    await expect(page).toHaveURL(`${world.community.url}/moderation/images`);
  });

  test("the sidebar carries a Moderation entry", async ({ page, world }) => {
    await page.goto(world.community.url);

    await expect(
      page.getByRole("link", { name: "Moderation", exact: true }),
    ).toBeVisible();
  });
});

test.describe("a moderator who can only review traits", () => {
  test.use({ persona: "moderator" });

  test("is offered the trait queue with its pending count, and not the image queue", async ({
    page,
    world,
  }) => {
    await page.goto(`${world.community.url}/moderation`);

    // One PENDING trait review is seeded by the preset.
    await expect(queueCard(page, "Trait Review", 1)).toBeVisible();
    await expect(anyQueueCard(page, "Image Moderation")).toHaveCount(0);
  });

  test("the trait card leads to the trait queue", async ({ page, world }) => {
    await page.goto(`${world.community.url}/moderation`);
    await queueCard(page, "Trait Review", 1).click();

    await expect(page).toHaveURL(`${world.community.url}/moderation/traits`);
  });
});

test.describe("a member who can moderate nothing", () => {
  test.use({ persona: "member" });

  test("is not offered the card on the admin dashboard", async ({
    page,
    world,
  }) => {
    await page.goto(`${world.community.url}/admin`);

    // Something from the page proper, so an empty result cannot be the page
    // simply not having rendered yet.
    await expect(
      page.getByRole("link", { name: /Member Management/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Content Moderation/ }),
    ).toHaveCount(0);
  });

  test("is not offered the sidebar entry", async ({ page, world }) => {
    await page.goto(world.community.url);

    await expect(
      page.getByRole("link", { name: "Members", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Moderation", exact: true }),
    ).toHaveCount(0);
  });

  test("is refused when visiting the index directly", async ({
    page,
    world,
  }) => {
    // The route is reachable by URL whatever the dashboard offers, so the
    // check has to live on the page and not only on the links into it.
    await page.goto(`${world.community.url}/moderation`);

    await expect(page.getByText("Access Denied")).toBeVisible();
    await expect(anyQueueCard(page, "Image Moderation")).toHaveCount(0);
    await expect(anyQueueCard(page, "Trait Review")).toHaveCount(0);
  });
});
