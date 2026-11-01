import type { Page } from "@playwright/test";
import { presetTest, expect } from "../../src/fixtures.js";
import { communityUrl } from "../../src/config.js";
import {
  SeedCreateCommunityDocument,
  SeedCreateSpeciesDocument,
  SeedCreateSpeciesVariantDocument,
  SeedCreateTraitDocument,
  SeedUpdateRoleDocument,
  TraitValueType,
} from "../../src/generated/graphql.js";

/**
 * Who sees the species admin pages, and on which host.
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

const expectDenied = (page: Page) =>
  expect(page.getByRole("heading", { name: "Access Denied" })).toBeVisible();

const expectNotFound = (page: Page) =>
  expect(page.getByRole("heading", { name: "Page Not Found" })).toBeVisible();

test.beforeEach(async ({ world }) => {
  await world.reset();
});

test.describe("a plain member", () => {
  test.use({ persona: "member" });

  test("sees no admin controls on the species page", async ({
    page,
    world,
  }) => {
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

  test("can browse the species list", async ({ page, world }) => {
    // Linked from the community page's Species card for every member. The
    // page hides its create and edit controls by permission itself.
    await page.goto(`${world.community.url}/species`);

    await expect(page.getByText(world.species.name).first()).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Access Denied" }),
    ).toHaveCount(0);
  });

  for (const path of [
    "/species/:id/edit",
    "/species/:id/traits",
    "/species/:id/variants",
  ]) {
    test(`is turned away from ${path}`, async ({ page, world }) => {
      await page.goto(
        `${world.community.url}${path.replace(":id", world.species.id)}`,
      );
      await expectDenied(page);
    });
  }

  test("is turned away from a trait's enum values", async ({ page, world }) => {
    await page.goto(
      `${world.community.url}/traits/${world.traits.eyeColor.id}/enum-values`,
    );
    await expectDenied(page);
  });

  for (const suffix of ["manage", "enum-settings"]) {
    test(`is turned away from a variant's ${suffix} page`, async ({
      page,
      world,
    }) => {
      await page.goto(
        `${world.community.url}/variants/${world.species.variantId}/${suffix}`,
      );
      await expectDenied(page);
    });
  }
});

test.describe("a moderator who can edit species", () => {
  test.use({ persona: "moderator" });

  test("sees the admin controls and reaches the trait builder", async ({
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

/**
 * Every write on these pages needs `canEditSpecies`. A role that can only
 * create species may open them, and sees what is there without the controls
 * it cannot use: buttons hidden, inputs that show a value disabled.
 */
test.describe("a role that can create species but not edit them", () => {
  test.use({ persona: "member" });

  test.beforeEach(async ({ world }) => {
    await world.as("commadmin").gql(SeedUpdateRoleDocument, {
      id: world.roles.member,
      updateRoleInput: { canCreateSpecies: true },
    });
  });

  const button = (page: Page, name: string) =>
    page.getByRole("button", { name, exact: true });

  test("sees the trait builder without its write controls", async ({
    page,
    world,
  }) => {
    await page.goto(
      `${world.community.url}/species/${world.species.id}/traits`,
    );

    await expect(page.getByText(world.traits.eyeColor.name)).toBeVisible();
    await expect(button(page, "Options")).toBeVisible();
    for (const name of ["Add Trait", "Edit", "Delete"]) {
      await expect(button(page, name)).toHaveCount(0);
    }
  });

  test("sees the variant list without its write controls", async ({
    page,
    world,
  }) => {
    await page.goto(
      `${world.community.url}/species/${world.species.id}/variants`,
    );

    await expect(button(page, "Manage")).toBeVisible();
    for (const name of ["Add Variant", "Delete"]) {
      await expect(button(page, name)).toHaveCount(0);
    }
  });

  test("sees a trait's options without their write controls", async ({
    page,
    world,
  }) => {
    await page.goto(
      `${world.community.url}/traits/${world.traits.eyeColor.id}/enum-values`,
    );

    await expect(page.getByText("Blue").first()).toBeVisible();
    for (const name of ["Add Option", "Up", "Down", "Edit", "Delete"]) {
      await expect(button(page, name)).toHaveCount(0);
    }
  });

  test("sees a variant without its write controls", async ({ page, world }) => {
    await page.goto(
      `${world.community.url}/variants/${world.species.variantId}/manage`,
    );

    await expect(page.getByPlaceholder("Variant name...")).toBeDisabled();
    await expect(page.getByTestId("variant-max-forms")).toBeDisabled();
    await expect(page.getByText(/Available Traits/)).toHaveCount(0);
    await expect(button(page, "Remove")).toHaveCount(0);
  });

  test("sees a variant's option settings disabled", async ({ page, world }) => {
    await page.goto(
      `${world.community.url}/variants/${world.species.variantId}/enum-settings`,
    );

    const toggles = page.getByRole("button", { name: /^(Enabled|Disabled)$/ });
    await expect(toggles.first()).toBeVisible();
    for (const toggle of await toggles.all()) {
      await expect(toggle).toBeDisabled();
    }
  });

  test("is turned away from the species edit form", async ({ page, world }) => {
    await page.goto(`${world.community.url}/species/${world.species.id}/edit`);
    await expectDenied(page);
  });
});

test.describe("a moderator who can edit species, on each page", () => {
  test.use({ persona: "moderator" });

  test("sees the write controls", async ({ page, world }) => {
    const button = (name: string) =>
      page.getByRole("button", { name, exact: true }).first();

    await page.goto(
      `${world.community.url}/species/${world.species.id}/traits`,
    );
    await expect(button("Add Trait")).toBeVisible();
    await expect(button("Edit")).toBeVisible();

    await page.goto(
      `${world.community.url}/species/${world.species.id}/variants`,
    );
    await expect(button("Add Variant")).toBeVisible();

    await page.goto(
      `${world.community.url}/traits/${world.traits.eyeColor.id}/enum-values`,
    );
    await expect(button("Add Option")).toBeVisible();

    await page.goto(
      `${world.community.url}/variants/${world.species.variantId}/manage`,
    );
    await expect(page.getByPlaceholder("Variant name...")).toBeEnabled();
    await expect(
      page.getByRole("heading", { name: /^Available Traits/ }),
    ).toBeVisible();

    await page.goto(
      `${world.community.url}/variants/${world.species.variantId}/enum-settings`,
    );
    await expect(
      page.getByRole("button", { name: /^(Enabled|Disabled)$/ }).first(),
    ).toBeEnabled();

    await page.goto(`${world.community.url}/species/${world.species.id}/edit`);
    await expect(
      page.getByRole("heading", { name: "Access Denied" }),
    ).toHaveCount(0);
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

/**
 * A species belongs to one community, and its pages live on that community's
 * host. Any other host answers not found, even for staff of both.
 */
test.describe("a species from another community", () => {
  test.use({ persona: "commadmin" });

  test("is not found on this community's host", async ({ page, world }) => {
    // commadmin creates the second community, so holds Admin in both: the
    // not found below is about the host, not about permissions.
    const staff = world.as("commadmin");
    const { createCommunity: other } = await staff.gql(
      SeedCreateCommunityDocument,
      { createCommunityInput: { name: "Elsewhere", slug: "elsewhere" } },
    );
    const { createSpecies: species } = await staff.gql(
      SeedCreateSpeciesDocument,
      {
        createSpeciesInput: {
          communityId: other.id,
          name: "Farflung",
          hasImage: false,
        },
      },
    );
    const { createSpeciesVariant: variant } = await staff.gql(
      SeedCreateSpeciesVariantDocument,
      { createSpeciesVariantInput: { speciesId: species.id, name: "Plain" } },
    );
    const { createTrait: trait } = await staff.gql(SeedCreateTraitDocument, {
      createTraitInput: {
        speciesId: species.id,
        name: "Fur",
        valueType: TraitValueType.Enum,
        allowsClarifier: false,
        allowsMultipleValues: false,
      },
    });

    // The baseline: on its own host the species is there.
    await page.goto(communityUrl("elsewhere", `/species/${species.id}/traits`));
    await expect(
      page.getByRole("heading", { name: "Trait Builder" }),
    ).toBeVisible();

    for (const path of [
      `/species/${species.id}`,
      `/species/${species.id}/edit`,
      `/species/${species.id}/traits`,
      `/species/${species.id}/variants`,
      `/traits/${trait.id}/enum-values`,
      `/variants/${variant.id}/manage`,
      `/variants/${variant.id}/enum-settings`,
    ]) {
      await test.step(path, async () => {
        await page.goto(`${world.community.url}${path}`);
        await expectNotFound(page);
      });
    }
  });
});
