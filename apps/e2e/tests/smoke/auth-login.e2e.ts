import { presetTest, expect } from "../../src/fixtures.js";
import { CFG } from "../../src/config.js";
import { REFRESH_COOKIE_NAME } from "../../src/world/refresh-cookie.js";

const test = presetTest("community-basic");
test.use({ persona: "anon" });

// Exercises the real login path once per persona. Every other spec injects the
// session via storageState instead, so this is the only place LoginPage's
// markup is a dependency.
for (const key of ["siteadmin", "commadmin", "moderator", "member"] as const) {
  test(`logs in as ${key} through the UI`, async ({ page, world }) => {
    const user = world.users[key];

    await page.goto("/login");
    // Login is by EMAIL, not username.
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(user.password);
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page).not.toHaveURL(/\/login/);
    // Storage holds nothing at all now: the access token lives in memory for
    // the life of the tab and the session that outlives it is the `HttpOnly`
    // refresh cookie (#339). So the cookie is what "logged in" means, and it
    // is scoped to the parent domain rather than to this one host.
    await expect
      .poll(async () =>
        (await page.context().cookies()).find(
          (c) => c.name === REFRESH_COOKIE_NAME,
        ),
      )
      .toMatchObject({ httpOnly: true, domain: `.${CFG.rootDomain}` });
  });
}

test("rejects a bad password", async ({ page, world }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(world.users.member.email);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page).toHaveURL(/\/login/);
});
