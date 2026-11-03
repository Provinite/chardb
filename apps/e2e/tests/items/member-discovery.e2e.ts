import { presetTest, expect } from "../../src/fixtures.js";
import { SeedCommunityMemberRolesDocument } from "../../src/generated/graphql.js";
import { spotlight } from "../../src/spotlight.js";
const test = presetTest("community-items");

/**
 * Getting to someone else's inventory without knowing the URL.
 *
 * The page itself was finished and correct; it was reachable from two list
 * screens and nowhere else, so staff who knew the product still could not find
 * it (#349). These specs cover the routes in rather than the page: a name on
 * the members list, the search box, and the trade you are already composing.
 */

test.describe("a member's profile inside a community", () => {
  test.use({ persona: "member" });

  test("a name on the members list opens their profile here", async ({
    page,
    world,
  }) => {
    await page.goto(`${world.community.url}/members`);

    await page
      .locator(
        `[data-testid="member-row"][data-username="${world.users.othermember.username}"]`,
      )
      .getByRole("link", { name: world.users.othermember.username })
      .click();

    await expect(page).toHaveURL(
      `${world.community.url}/members/${world.users.othermember.username}`,
    );
    // Their standing *here*, which is the whole reason this is not
    // /user/:username.
    await expect(page.getByTestId("member-role-tags")).toContainText("Member");
  });

  test("the profile lists their characters in this community", async ({
    page,
    world,
  }) => {
    await page.goto(
      `${world.community.url}/members/${world.users.othermember.username}`,
    );

    await expect(
      page.getByRole("link", { name: world.characters.marrowfen.name }),
    ).toBeVisible();
    // `member`'s, not `othermember`'s -- the grid is filtered by owner.
    await expect(
      page.getByRole("link", { name: world.characters.bramblefoot.name }),
    ).toHaveCount(0);
  });

  test("its Inventory button reaches their holdings", async ({
    page,
    world,
  }) => {
    await page.goto(
      `${world.community.url}/members/${world.users.othermember.username}`,
    );

    await page.getByTestId("member-inventory-link").click();

    await expect(page).toHaveURL(
      `${world.community.url}/members/${world.users.othermember.username}/inventory`,
    );
    await expect(
      page.locator(
        `[data-testid="holding-group"][data-item-type-id="${world.itemTypes.locket.id}"]`,
      ),
    ).toBeVisible();
  });

  test("offers no trade with yourself", async ({ page, world }) => {
    await page.goto(
      `${world.community.url}/members/${world.users.member.username}`,
    );

    await expect(page.getByTestId("member-inventory-link")).toBeVisible();
    await expect(page.getByRole("link", { name: "Propose trade" })).toHaveCount(
      0,
    );
  });
});

test.describe("finding a member from the search box", () => {
  test.use({ persona: "member" });

  // Scoped to the community you are standing in: the same name means a
  // different person in each one, so the search only runs inside a
  // community's pages.
  test.beforeEach(async ({ page, world }) => {
    await page.goto(world.community.url);
  });

  test("picking a person offers their pages rather than leaving", async ({
    page,
    world,
  }) => {
    const s = spotlight(page);
    await s.search(`@${world.users.othermember.username}`);
    await s.result(world.users.othermember.username).click();

    // Still in the palette, one level down. Picking a person is half a
    // request; this is the other half -- so the page did not move.
    await expect(page).toHaveURL(`${world.community.url}/`);
    await expect(s.result(/^Profile/)).toBeVisible();
    await expect(s.result(/^Inventory/)).toBeVisible();
    await expect(s.result(/^Characters/)).toBeVisible();
  });

  test("their Inventory from there reaches their holdings", async ({
    page,
    world,
  }) => {
    const s = spotlight(page);
    await s.search(`@${world.users.othermember.username}`);
    await s.result(world.users.othermember.username).click();
    await s.result(/^Inventory/).click();

    await expect(page).toHaveURL(
      `${world.community.url}/members/${world.users.othermember.username}/inventory`,
    );
  });

  test("their Profile from there reaches the profile", async ({
    page,
    world,
  }) => {
    const s = spotlight(page);
    await s.search(`@${world.users.othermember.username}`);
    await s.result(world.users.othermember.username).click();
    await s.result(/^Profile/).click();

    await expect(page).toHaveURL(
      `${world.community.url}/members/${world.users.othermember.username}`,
    );
  });

  test("typing past the slash narrows their pages", async ({ page, world }) => {
    const s = spotlight(page);
    await s.search(`@${world.users.othermember.username}/inv`);

    await expect(s.result(/^Inventory/)).toBeVisible();
    await expect(s.result(/^Profile/)).toHaveCount(0);
  });

  test("offers no trade with yourself", async ({ page, world }) => {
    const s = spotlight(page);
    await s.search(`@${world.users.member.username}/`);

    await expect(s.result(/^Inventory/)).toBeVisible();
    await expect(s.result(/^Propose trade/)).toHaveCount(0);
  });

  test("the same name without the @ searches pages only", async ({
    page,
    world,
  }) => {
    // The sigil is the whole gate. Without it the box is what it always
    // was, and does not spend a round trip per keystroke asking about
    // people.
    const s = spotlight(page);
    await s.search(world.users.othermember.username);

    await expect(s.result(world.users.othermember.username)).toHaveCount(0);
  });

  test("@ on its own lists who is here", async ({ page }) => {
    // Asserting that people came back rather than which ones: the server
    // returns the first few alphabetically, and naming one would pin this
    // to the preset's roster rather than to the behaviour.
    const s = spotlight(page);
    await s.search("@");

    // A member row reads "<name>@<username>" -- the label and the handle
    // beneath it. Nothing else in the palette carries an @.
    await expect(s.result(/@/).first()).toBeVisible();
  });

  test("an exact name comes back first", async ({ page, world }) => {
    // `member` is also a substring of `othermember`. This world holds
    // nobody who sorts ahead of an exact match while containing it, so
    // ordering is pinned properly in `communities.service.spec.ts` -- this
    // only asserts the two do not come back the wrong way round through the
    // real stack.
    const s = spotlight(page);
    await s.search(`@${world.users.member.username}`);

    await expect(s.result(/@/).first()).toHaveText(
      new RegExp(`@${world.users.member.username}$`),
    );
  });
});

test.describe("searching the members list", () => {
  test.use({ persona: "member" });

  test("asks the server, so members past the first page are found", async ({
    page,
    world,
  }) => {
    await page.goto(`${world.community.url}/members`);
    await expect(page.getByTestId("member-row").first()).toBeVisible();

    const { username } = world.users.othermember;
    // Filtering only the loaded page is what hid a new member until "Load
    // more" was clicked (#566); the search has to reach the query.
    const searched = page.waitForRequest(
      (req) =>
        req.url().includes("/graphql") &&
        req.postDataJSON()?.operationName === "CommunityMembersWithRoles" &&
        req.postDataJSON()?.variables?.search === username,
    );
    await page
      .getByRole("searchbox", { name: "Search members" })
      .fill(username);
    await searched;

    await expect(page.getByTestId("member-row")).toHaveCount(1);
    await expect(
      page.locator(`[data-testid="member-row"][data-username="${username}"]`),
    ).toBeVisible();
  });

  test("a failed search leaves the search box to try again", async ({
    page,
    world,
  }) => {
    await page.route("**/graphql", (route) =>
      route.request().postDataJSON()?.variables?.search === "unlucky"
        ? route.abort()
        : route.fallback(),
    );
    await page.goto(`${world.community.url}/members`);
    const box = page.getByRole("searchbox", { name: "Search members" });

    await box.fill("unlucky");
    await expect(page.getByText("could not be loaded")).toBeVisible();

    const { username } = world.users.othermember;
    await box.fill(username);
    await expect(
      page.locator(`[data-testid="member-row"][data-username="${username}"]`),
    ).toBeVisible();
    await expect(page.getByText("could not be loaded")).toHaveCount(0);
  });
});

test.describe("the trade composer", () => {
  test.use({ persona: "member" });

  test("links out to the partner's full inventory", async ({ page, world }) => {
    // The pane beside the link shows only what can move. Whether an offer is
    // fair often turns on what cannot, and that is a different page.
    await page.goto(
      `${world.community.url}/trades/new?with=${world.users.othermember.userId}`,
    );

    await page.getByTestId("their-full-inventory").click();

    await expect(page).toHaveURL(
      `${world.community.url}/members/${world.users.othermember.username}/inventory`,
    );
  });
});

test.describe("who may ask what someone's role here is", () => {
  test("a fellow member may", async ({ world }) => {
    const { communityMemberRoles } = await world
      .as("member")
      .gql(SeedCommunityMemberRolesDocument, {
        communityId: world.community.id,
        userId: world.users.quartermaster.userId,
      });

    expect(communityMemberRoles.map((r) => r.name)).toContain("Quartermaster");
  });

  test("someone outside the community may not", async ({ world }) => {
    // The narrowing that makes this readable at all is the community. Asking
    // what roles a person holds without one is asking about them everywhere,
    // which is what `communityMembersByUser` refuses.
    await expect(
      world.as("outsider").gql(SeedCommunityMemberRolesDocument, {
        communityId: world.community.id,
        userId: world.users.quartermaster.userId,
      }),
    ).rejects.toThrow();
  });
});
