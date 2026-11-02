import { presetTest, expect } from "../../src/fixtures.js";
import { makePrisma } from "../../src/world/ctx.js";

/**
 * A community with open sign-up takes anyone, without an invite code: a new
 * visitor as part of creating an account, an existing account with one click.
 */

const test = presetTest("open-signup");

test.beforeEach(async ({ world }) => {
  await world.reset();
});

const membershipsOf = async (email: string) => {
  const prisma = makePrisma();
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { communityMemberships: true },
    });
    return user?.communityMemberships.map((m) => m.roleId) ?? null;
  } finally {
    await prisma.$disconnect();
  }
};

test.describe("a visitor", () => {
  test("signs up from the community page without an invite code", async ({
    page,
    world,
  }) => {
    await page.goto(world.open.url);
    await page.getByRole("link", { name: "Sign Up to Join" }).click();

    await expect(page).toHaveURL(`${world.open.url}/signup`);
    await expect(
      page.getByRole("heading", { name: "Join Open Glade" }),
    ).toBeVisible();
    await expect(page.locator("#inviteCode")).toHaveCount(0);

    await page.fill("#username", "glader");
    await page.fill("#email", "glader@e2e.local");
    await page.fill("#password", "password123");
    await page.fill("#confirmPassword", "password123");
    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(
      page.getByRole("heading", { name: "Check your email" }),
    ).toBeVisible();
    expect(await membershipsOf("glader@e2e.local")).toEqual([
      world.open.memberRoleId,
    ]);
  });

  test("signs up from the header menu without an invite code", async ({
    page,
    world,
  }) => {
    await page.goto(world.open.url);
    await page.getByRole("button", { name: "Log in or sign up" }).click();
    await page.getByRole("menuitem", { name: "Sign up" }).click();

    await expect(page).toHaveURL(`${world.open.url}/signup`);
    await expect(
      page.getByRole("heading", { name: "Join Open Glade" }),
    ).toBeVisible();
    await expect(page.locator("#inviteCode")).toHaveCount(0);

    // Sign-in asks for the email, so that is the identifier a password
    // manager should save with the new password, not the handle.
    await expect(page.locator("#email")).toHaveAttribute(
      "autocomplete",
      "username",
    );
    await expect(page.locator("#username")).toHaveAttribute(
      "autocomplete",
      "off",
    );

    await page.fill("#username", "menuglader");
    await page.fill("#email", "menuglader@e2e.local");
    await page.fill("#password", "password123");
    await page.fill("#confirmPassword", "password123");
    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(
      page.getByRole("heading", { name: "Check your email" }),
    ).toBeVisible();
    expect(await membershipsOf("menuglader@e2e.local")).toEqual([
      world.open.memberRoleId,
    ]);
  });

  test("still needs a code for a community that takes invites", async ({
    page,
    world,
  }) => {
    await page.goto(world.closed.url);
    await expect(
      page.getByRole("link", { name: "Sign In to Join" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Sign Up to Join" }),
    ).toHaveCount(0);

    await page.goto(`${world.closed.url}/signup`);
    await expect(
      page.getByRole("heading", { name: "Join Closed Hollow" }),
    ).toBeVisible();
    await expect(page.getByText("Closed Hollow is invite-only")).toBeVisible();
    await expect(page.getByLabel("Invite code")).toBeVisible();
  });

  test("waits for the community's current setting, not a remembered one", async ({
    page,
    world,
  }) => {
    // The host remembers its community between visits. A copy from when
    // Closed Hollow was open must not decide the form: until the fresh record
    // lands the form is a placeholder, so no field appears above the others
    // once it does.
    await page.addInitScript(
      ({ key, value }) => window.localStorage.setItem(key, value),
      {
        key: `chardb.community.${world.closed.slug}`,
        value: JSON.stringify({
          id: world.closed.id,
          name: world.closed.name,
          slug: world.closed.slug,
          openSignupRoleId: world.closed.memberRoleId,
        }),
      },
    );
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/graphql", async (route) => {
      if (route.request().postData()?.includes("CommunityBySlug")) {
        await held;
      }
      await route.continue();
    });

    await page.goto(`${world.closed.url}/signup`);
    const heading = page.getByRole("heading", { name: "Join Closed Hollow" });
    await expect(heading).toBeVisible();
    await expect(page.locator("#username")).toHaveCount(0);
    await expect(page.locator("#inviteCode")).toHaveCount(0);
    // The line under the heading is held open, so its text lands in place.
    const subtitle = page.locator("main header p");
    expect((await subtitle.boundingBox())?.height ?? 0).toBeGreaterThan(0);
    const before = await subtitle.boundingBox();

    release();
    await expect(page.getByLabel("Invite code")).toBeVisible();
    await expect(page.getByText("Closed Hollow is invite-only")).toBeVisible();
    expect((await subtitle.boundingBox())?.height).toBe(before?.height);
    await expect(
      page.getByRole("button", { name: "Create Account" }),
    ).toBeEnabled();
  });

  test("falls back to the remembered setting when the fresh read fails", async ({
    page,
    world,
  }) => {
    // A failed read is "unknown", not "invite-only": the host's own record
    // still says Open Glade is open, so the form should too.
    await page.addInitScript(
      ({ key, value }) => window.localStorage.setItem(key, value),
      {
        key: `chardb.community.${world.open.slug}`,
        value: JSON.stringify({
          id: world.open.id,
          name: world.open.name,
          slug: world.open.slug,
          openSignupRoleId: world.open.memberRoleId,
        }),
      },
    );
    await page.route("**/graphql", async (route) => {
      if (route.request().postData()?.includes("CommunityBySlug")) {
        await route.abort();
        return;
      }
      await route.continue();
    });

    await page.goto(`${world.open.url}/signup`);
    await expect(
      page.getByRole("heading", { name: "Join Open Glade" }),
    ).toBeVisible();
    await expect(page.locator("#username")).toBeVisible();
    await expect(page.locator("#inviteCode")).toHaveCount(0);
    await expect(page.getByText("is invite-only")).toHaveCount(0);
  });
});

test.describe("an existing account", () => {
  test.use({ persona: "outsider" });

  test("joins with one click", async ({ page, world }) => {
    await page.goto(world.open.url);
    await page.getByRole("button", { name: "Join Community" }).click();

    await expect(page.getByRole("link", { name: "Manage" })).toBeVisible();
    expect(await membershipsOf(world.users.outsider.email)).toEqual([
      world.open.memberRoleId,
    ]);
  });
});

test.describe("community staff", () => {
  test.use({ persona: "commadmin" });

  test("open sign-up from the invite codes page", async ({ page, world }) => {
    await page.goto(`${world.closed.url}/invite-codes`);
    const select = page.getByLabel("Who can join");
    await expect(select).toHaveValue("");

    await select.selectOption({ label: "Anyone, as Member" });

    await expect(page.getByText("Anyone can now join as Member")).toBeVisible();
    const prisma = makePrisma();
    try {
      const community = await prisma.community.findUniqueOrThrow({
        where: { id: world.closed.id },
      });
      expect(community.openSignupRoleId).toBe(world.closed.memberRoleId);
    } finally {
      await prisma.$disconnect();
    }
  });
});
