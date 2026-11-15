import { presetTest, expect } from "../../src/fixtures.js";
import {
  apexUrl,
  CFG,
  communityUrl,
  urlStartingWith,
} from "../../src/config.js";
import { withClient } from "../../src/db/sql.js";

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
    // Written directly: making a code through the API takes the global
    // canCreateInviteCode flag, which no persona in this preset holds.
    await withClient(CFG.databaseUrl, (client) =>
      client.query(
        `INSERT INTO invite_codes (id, max_claims, claim_count, creator_id, role_id, created_at, updated_at)
         SELECT $1, 5, 0, u.id, $2, now(), now() FROM users u WHERE u.username = 'commadmin'`,
        [code, world.roles.member],
      ),
    );

    await page.goto(apexUrl("/join-community"));
    await page.getByLabel("Invite Code").fill(code);
    await expect(page.getByText(world.community.name).first()).toBeVisible();
    await page.getByRole("button", { name: "Join Community" }).click();

    await expect(page).toHaveURL(
      urlStartingWith(communityUrl(world.community.slug)),
    );

    const holders = await withClient(CFG.databaseUrl, async (client) => {
      const { rows } = await client.query<{ username: string }>(
        `SELECT u.username FROM community_members cm
           JOIN users u ON u.id = cm.user_id
          WHERE cm.role_id = $1 AND u.username IN ('siteadmin', 'commadmin')`,
        [world.roles.member],
      );
      return rows.map((row) => row.username);
    });
    expect(holders).toEqual(["siteadmin"]);
  });
});
