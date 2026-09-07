import { presetTest, expect } from "../../src/fixtures.js";

/**
 * Email verification (#372).
 *
 * The behaviour worth pinning through a browser is the shape of the gate, not
 * the token arithmetic -- the service spec covers that. So: signing up does not
 * sign you in, an unconfirmed account is told why it cannot sign in and offered
 * a way out, and following the link actually opens the door.
 */

const test = presetTest("email-verification");

test.describe("signing up", () => {
  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("ends at 'check your email' rather than the dashboard", async ({
    page,
    world,
  }) => {
    await page.goto("/signup");

    await page.fill("#inviteCode", world.inviteCode);
    await page.fill("#username", "freshaccount");
    await page.fill("#email", "freshaccount@e2e.local");
    await page.fill("#displayName", "Fresh Account");
    await page.fill("#password", "password123");
    await page.fill("#confirmPassword", "password123");
    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(
      page.getByRole("heading", { name: "Check your email" }),
    ).toBeVisible();
    await expect(page.getByText("freshaccount@e2e.local")).toBeVisible();

    // The account exists but holds no session, so the app must not have moved
    // on to anything behind the login wall.
    await expect(page).toHaveURL(/\/signup$/);
  });
});

test.describe("signing in before confirming", () => {
  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("is refused, and offers to send the link again", async ({
    page,
    world,
  }) => {
    await page.goto("/login");
    await page.fill("#email", world.unconfirmed.email);
    await page.fill("#password", world.unconfirmed.password);
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(
      page.getByText("Confirm your email address first"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Resend the link" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("the resend button says nothing about whether the address is known", async ({
    page,
    world,
  }) => {
    await page.goto("/login");
    await page.fill("#email", world.unconfirmed.email);
    await page.fill("#password", world.unconfirmed.password);
    await page.getByRole("button", { name: "Sign In" }).click();

    await page.getByRole("button", { name: "Resend the link" }).click();

    // Conditional wording, deliberately: the server refuses an unknown address,
    // an already-confirmed one and one over its allowance identically, so any
    // definite confirmation here would be a claim the backend never made.
    await expect(
      page.getByText("If that address still needs confirming"),
    ).toBeVisible();
  });
});

test.describe("following the link", () => {
  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("confirms the account, and it can then sign in", async ({
    page,
    world,
  }) => {
    await page.goto(`/verify-email/${world.unconfirmed.verifyToken}`);

    await expect(
      page.getByRole("heading", { name: "Email Confirmed" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Sign in" }).click();
    await page.fill("#email", world.unconfirmed.email);
    await page.fill("#password", world.unconfirmed.password);
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("an expired link says so and leaves the account shut", async ({
    page,
    world,
  }) => {
    await page.goto(`/verify-email/${world.unconfirmed.expiredToken}`);

    await expect(
      page.getByRole("heading", { name: "Link Didn't Work" }),
    ).toBeVisible();
    await expect(page.getByText("has expired")).toBeVisible();

    await page.goto("/login");
    await page.fill("#email", world.unconfirmed.email);
    await page.fill("#password", world.unconfirmed.password);
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(
      page.getByText("Confirm your email address first"),
    ).toBeVisible();
  });

  test("a spent link on an account still unconfirmed is refused", async ({
    page,
    world,
  }) => {
    await page.goto(`/verify-email/${world.unconfirmed.usedToken}`);

    await expect(
      page.getByRole("heading", { name: "Link Didn't Work" }),
    ).toBeVisible();
    await expect(page.getByText("already been used")).toBeVisible();
  });
});
