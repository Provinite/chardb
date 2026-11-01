import { presetTest, expect } from "../../src/fixtures.js";
import { apexUrl } from "../../src/config.js";
import { spotlight } from "../../src/spotlight.js";

const test = presetTest("community-items");

/**
 * The page search, opened from the sidebar or with Mod+K. Member search is
 * covered in `items/member-discovery.e2e.ts`.
 */
test.describe("page search", () => {
  test.use({ persona: "member" });

  test.beforeEach(async ({ page, world }) => {
    await page.goto(world.community.url);
  });

  test("the sidebar button opens it, ready to type", async ({ page }) => {
    const s = spotlight(page);
    await s.trigger.click();

    await expect(s.dialog).toBeVisible();
    await expect(s.input).toBeFocused();
  });

  test("Mod+K opens it", async ({ page }) => {
    const s = spotlight(page);
    await page.keyboard.press("ControlOrMeta+k");

    await expect(s.dialog).toBeVisible();
    await expect(s.input).toBeFocused();
  });

  test("Escape closes it and focus goes back to the button", async ({
    page,
  }) => {
    const s = spotlight(page);
    await s.trigger.click();
    await expect(s.input).toBeFocused();

    await page.keyboard.press("Escape");

    await expect(s.dialog).toBeHidden();
    await expect(s.trigger).toBeFocused();
  });

  test("a click outside closes it", async ({ page }) => {
    const s = spotlight(page);
    await s.trigger.click();
    await expect(s.dialog).toBeVisible();

    // The top-left corner is scrim at any viewport: the dialog is centred.
    await page.mouse.click(2, 2);

    await expect(s.dialog).toBeHidden();
  });

  test("shows at most seven results", async ({ page }) => {
    const s = spotlight(page);
    await s.trigger.click();

    await expect(s.results).toHaveCount(7);
  });

  test("typing narrows the results", async ({ page }) => {
    const s = spotlight(page);
    await s.search("liked");

    await expect(s.result(/^Liked Characters/)).toBeVisible();
    await expect(s.result(/^Browse Characters/)).toHaveCount(0);
  });

  test("marks what matched", async ({ page }) => {
    const s = spotlight(page);
    await s.search("liked");

    await expect(
      s
        .result(/^Liked Characters/)
        .locator("mark")
        .first(),
    ).toHaveText(/^liked$/i);
  });

  test("a click on a result goes there and closes it", async ({
    page,
    world,
  }) => {
    const s = spotlight(page);
    await s.search("members");
    await s.result(/^Members/).click();

    await expect(page).toHaveURL(`${world.community.url}/members`);
    await expect(s.dialog).toBeHidden();
  });

  test("arrow keys and Enter pick a result", async ({ page, world }) => {
    const s = spotlight(page);
    // One result, so where the selection starts does not matter: ArrowDown
    // lands on it either way.
    await s.search("inventory");
    await expect(s.results).toHaveCount(1);

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(`${world.community.url}/inventory`);
    await expect(s.dialog).toBeHidden();
  });

  test("a result on another host loads that host", async ({ page }) => {
    const s = spotlight(page);
    await s.search("liked characters");
    await s.result(/^Liked Characters/).click();

    await expect(page).toHaveURL(apexUrl("/liked/characters"));
  });

  test("offers no Halloween pages while the event is off", async ({ page }) => {
    const s = spotlight(page);
    await s.search("halloween");

    await expect(s.results).toHaveCount(0);
  });

  test("says so when nothing matches", async ({ page }) => {
    const s = spotlight(page);
    await s.search("zzzzzz");

    await expect(s.results).toHaveCount(0);
    await expect(s.dialog).toContainText("No pages found... try @ for members");
  });

  test("opens empty after being closed", async ({ page }) => {
    const s = spotlight(page);
    await s.search("liked");
    await page.keyboard.press("Escape");
    await expect(s.dialog).toBeHidden();

    await s.trigger.click();

    await expect(s.input).toHaveValue("");
  });
});

test.describe("page search at the apex", () => {
  test.use({ persona: "member" });

  test("member search asks for a community first", async ({ page }) => {
    await page.goto(apexUrl("/dashboard"));

    const s = spotlight(page);
    await s.search("@someone");

    await expect(s.dialog).toContainText(
      "Open a community to search its members",
    );
  });
});
