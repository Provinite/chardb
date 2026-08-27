import { test, expect } from "../../src/fixtures.js";

test.use({ preset: "community-basic", persona: "anon" });

// Exercises the real login path once per persona. Every other spec injects the
// token via storageState instead, so this is the only place LoginPage's markup
// is a dependency.
for (const key of ["siteadmin", "commadmin", "moderator", "member"] as const) {
  test(`logs in as ${key} through the UI`, async ({ page, world }) => {
    const user = world.users[key];

    await page.goto("/login");
    // Login is by EMAIL, not username.
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(user.password);
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page).not.toHaveURL(/\/login/);
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("accessToken")))
      .toBeTruthy();
  });
}

test("rejects a bad password", async ({ page, world }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(world.users.member.email);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page).toHaveURL(/\/login/);
});
