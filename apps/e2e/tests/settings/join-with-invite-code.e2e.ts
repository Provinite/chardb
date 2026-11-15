import { presetTest, expect } from "../../src/fixtures.js";
import { apexUrl, communityUrl, urlStartingWith } from "../../src/config.js";
import {
  SeedCreateInviteCodeDocument,
  SeedMyMembershipsDocument,
} from "../../src/generated/graphql.js";

const test = presetTest("community-basic");

/**
 * Joining a community with an invite code, from the join page. The server
 * joins whoever is signed in; the page sends only the code.
 */
test.describe("joining with an invite code", () => {
  // Holds no role in Willowmere.
  test.use({ persona: "siteadmin" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("joins the signed-in user to the code's community", async ({
    page,
    world,
  }) => {
    const code = `join${Date.now()}`;
    await world.as("inviter").gql(SeedCreateInviteCodeDocument, {
      input: { id: code, maxClaims: 5, roleId: world.roles.member },
    });

    await page.goto(apexUrl("/join-community"));
    await page.getByLabel("Invite Code").fill(code);
    await expect(page.getByText(world.community.name).first()).toBeVisible();
    await page.getByRole("button", { name: "Join Community" }).click();

    await expect(page).toHaveURL(
      urlStartingWith(communityUrl(world.community.slug)),
    );

    const rolesOf = async (persona: "siteadmin" | "inviter") =>
      (
        await world.as(persona).gql(SeedMyMembershipsDocument, {})
      ).me.communityMemberships.nodes.map((node) => node.role.id);
    expect(await rolesOf("siteadmin")).toContain(world.roles.member);
    expect(await rolesOf("inviter")).toEqual([]);
  });
});
