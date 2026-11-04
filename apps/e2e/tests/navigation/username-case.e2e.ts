import { presetTest, expect } from "../../src/fixtures.js";
const test = presetTest("community-items");

/**
 * A username in a URL ignores case. The page loads under any casing and then
 * puts the URL back into the one the person signed up with.
 */
const shout = (username: string) => username.toUpperCase();

test.describe("username casing in URLs", () => {
  test.use({ persona: "member" });

  test("a profile loads under another casing and corrects the URL", async ({
    page,
    world,
  }) => {
    const owner = world.users.othermember.username;
    await page.goto(`/user/${shout(owner)}/followers?tab=1`);

    await expect(page).toHaveURL(
      new RegExp(`/user/${owner}/followers\\?tab=1$`),
    );
    await expect(
      page.getByRole("heading", { level: 1, name: /'s Followers$/ }),
    ).toBeVisible();
  });

  test("a member page inside a community does the same", async ({
    page,
    world,
  }) => {
    const owner = world.users.othermember.username;
    await page.goto(`${world.community.url}/members/${shout(owner)}`);

    await expect(page).toHaveURL(`${world.community.url}/members/${owner}`);
    await expect(page.getByTestId("member-role-tags")).toContainText("Member");
  });

  test("your own items under another casing are still yours", async ({
    page,
    world,
  }) => {
    const me = world.users.member.username;
    await page.goto(`${world.community.url}/members/${shout(me)}/inventory`);

    await expect(page).toHaveURL(
      `${world.community.url}/members/${me}/inventory`,
    );
    await expect(
      page.getByRole("heading", { name: "Your Inventory" }),
    ).toBeVisible();
  });
});
