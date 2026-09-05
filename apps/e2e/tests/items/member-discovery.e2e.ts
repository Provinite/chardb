import { presetTest, expect } from "../../src/fixtures.js";
import type { Page } from "@playwright/test";
import { SeedCommunityMemberRolesDocument } from "../../src/generated/graphql.js";
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
      new RegExp(
        `/communities/${world.community.id}/members/${world.users.othermember.username}$`,
      ),
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
      new RegExp(
        `/communities/${world.community.id}/members/${world.users.othermember.username}/inventory$`,
      ),
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

  const openSpotlight = async (page: Page, query: string) => {
    await page.getByRole("button", { name: "Search pages" }).click();
    await page
      .getByPlaceholder("Search pages, or @ for members...")
      .fill(query);
  };

  test("picking a person offers their pages rather than leaving", async ({
    page,
    world,
  }) => {
    // Scoped to the community you are standing in: the same name means a
    // different person in each one, so the search only runs inside a
    // community's pages.
    await page.goto(world.community.url);

    await openSpotlight(page, `@${world.users.othermember.username}`);
    await page
      .getByRole("button", { name: world.users.othermember.username })
      .click();

    // Still in the palette, one level down. Picking a person is half a
    // request; this is the other half.
    await expect(page).toHaveURL(new RegExp(`${world.community.id}$`));
    await expect(page.getByRole("button", { name: /^Profile/ })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^Inventory/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^Characters/ }),
    ).toBeVisible();
  });

  test("their Inventory from there reaches their holdings", async ({
    page,
    world,
  }) => {
    await page.goto(world.community.url);

    await openSpotlight(page, `@${world.users.othermember.username}`);
    await page
      .getByRole("button", { name: world.users.othermember.username })
      .click();
    await page.getByRole("button", { name: /^Inventory/ }).click();

    await expect(page).toHaveURL(
      new RegExp(
        `/communities/${world.community.id}/members/${world.users.othermember.username}/inventory$`,
      ),
    );
  });

  test("their Profile from there reaches the profile", async ({
    page,
    world,
  }) => {
    await page.goto(world.community.url);

    await openSpotlight(page, `@${world.users.othermember.username}`);
    await page
      .getByRole("button", { name: world.users.othermember.username })
      .click();
    await page.getByRole("button", { name: /^Profile/ }).click();

    await expect(page).toHaveURL(
      new RegExp(
        `/communities/${world.community.id}/members/${world.users.othermember.username}$`,
      ),
    );
  });

  test("typing past the slash narrows their pages", async ({ page, world }) => {
    await page.goto(world.community.url);

    await openSpotlight(page, `@${world.users.othermember.username}/inv`);

    await expect(
      page.getByRole("button", { name: /^Inventory/ }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /^Profile/ })).toHaveCount(0);
  });

  test("offers no trade with yourself", async ({ page, world }) => {
    await page.goto(world.community.url);

    await openSpotlight(page, `@${world.users.member.username}/`);

    await expect(
      page.getByRole("button", { name: /^Inventory/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^Propose trade/ }),
    ).toHaveCount(0);
  });

  test("the same name without the @ searches pages only", async ({
    page,
    world,
  }) => {
    // The sigil is the whole gate. Without it the box is what it always was,
    // and does not spend a round trip per keystroke asking about people.
    await page.goto(world.community.url);

    await openSpotlight(page, world.users.othermember.username);

    await expect(
      page.getByRole("button", { name: world.users.othermember.username }),
    ).toHaveCount(0);
  });

  test("@ on its own lists who is here", async ({ page, world }) => {
    // Asserting that people came back rather than which ones: the server
    // returns the first few alphabetically, and naming one would pin this to
    // the preset's roster rather than to the behaviour.
    await page.goto(world.community.url);

    await openSpotlight(page, "@");

    // A member row reads "<name>@<username>" -- the label and the handle
    // beneath it. Nothing else in the palette carries an @.
    await expect(page.getByRole("button", { name: /@/ }).first()).toBeVisible();
  });

  test("an exact name comes back first", async ({ page, world }) => {
    // `member` is also a substring of `othermember`. This world holds nobody
    // who sorts ahead of an exact match while containing it, so ordering is
    // pinned properly in `communities.service.spec.ts` -- this only asserts
    // the two do not come back the wrong way round through the real stack.
    await page.goto(world.community.url);

    await openSpotlight(page, `@${world.users.member.username}`);

    await expect(
      page.getByRole("button", { name: /@/ }).first(),
    ).toHaveAccessibleName(new RegExp(`@${world.users.member.username}$`));
  });
});

test.describe("the trade composer", () => {
  test.use({ persona: "member" });

  test("links out to the partner's full inventory", async ({ page, world }) => {
    // The pane beside the link shows only what can move. Whether an offer is
    // fair often turns on what cannot, and that is a different page.
    await page.goto(
      `/communities/${world.community.id}/trades/new?with=${world.users.othermember.userId}`,
    );

    await page.getByTestId("their-full-inventory").click();

    await expect(page).toHaveURL(
      new RegExp(
        `/communities/${world.community.id}/members/${world.users.othermember.username}/inventory$`,
      ),
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
