import { presetTest, expect } from "../../src/fixtures.js";

/**
 * Who sees the species admin pages.
 *
 * The species page offered its Traits and Variants cards to anyone signed in,
 * and the routes behind them checked only that someone was signed in. A plain
 * member could open the Trait Builder, with its Edit and Delete buttons. The
 * backend refused the writes, so nothing changed, but staff tooling was on
 * show to every member.
 */
const test = presetTest("community-basic");

const TRAITS_CARD = "Configure and manage traits";
const VARIANTS_CARD = "Manage different variants";

test.beforeEach(async ({ world }) => {
  await world.reset();
});

test.describe("a plain member", () => {
  test.use({ persona: "member" });

  test("sees no admin cards on the species page", async ({ page, world }) => {
    await page.goto(`${world.community.url}/species/${world.species.id}`);

    // The public card, so the absences below are not just an unloaded page.
    await expect(
      page.getByText("Browse characters created using this species"),
    ).toBeVisible();
    await expect(page.getByText(TRAITS_CARD)).toHaveCount(0);
    await expect(page.getByText(VARIANTS_CARD)).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Manage Species" }),
    ).toHaveCount(0);
  });

  for (const path of [
    "/species",
    "/species/:id/edit",
    "/species/:id/traits",
    "/species/:id/variants",
  ]) {
    test(`is turned away from ${path}`, async ({ page, world }) => {
      await page.goto(
        `${world.community.url}${path.replace(":id", world.species.id)}`,
      );

      await expect(
        page.getByRole("heading", { name: "Access Denied" }),
      ).toBeVisible();
    });
  }

  test("is turned away from a trait's enum values", async ({ page, world }) => {
    await page.goto(
      `${world.community.url}/traits/${world.traits.eyeColor.id}/enum-values`,
    );

    await expect(
      page.getByRole("heading", { name: "Access Denied" }),
    ).toBeVisible();
  });

  for (const suffix of ["manage", "enum-settings"]) {
    test(`is turned away from a variant's ${suffix} page`, async ({
      page,
      world,
    }) => {
      await page.goto(
        `${world.community.url}/variants/${world.species.variantId}/${suffix}`,
      );

      await expect(
        page.getByRole("heading", { name: "Access Denied" }),
      ).toBeVisible();
    });
  }
});

test.describe("a moderator who can edit species", () => {
  test.use({ persona: "moderator" });

  test("sees the admin cards and reaches the trait builder", async ({
    page,
    world,
  }) => {
    await page.goto(`${world.community.url}/species/${world.species.id}`);
    await expect(page.getByText(TRAITS_CARD)).toBeVisible();
    await expect(page.getByText(VARIANTS_CARD)).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Manage Species" }),
    ).toBeVisible();

    await page.getByText(TRAITS_CARD).click();
    await expect(
      page.getByRole("heading", { name: "Trait Builder" }),
    ).toBeVisible();
  });
});

test.describe("a site admin outside the community", () => {
  test.use({ persona: "siteadmin" });

  test("reaches the trait builder", async ({ page, world }) => {
    await page.goto(
      `${world.community.url}/species/${world.species.id}/traits`,
    );

    await expect(
      page.getByRole("heading", { name: "Trait Builder" }),
    ).toBeVisible();
  });
});
