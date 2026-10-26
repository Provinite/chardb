import { presetTest, expect } from "../../src/fixtures.js";
import { CFG } from "../../src/config.js";
import { withClient } from "../../src/db/sql.js";
import { SeedUpdateRoleDocument } from "../../src/generated/graphql.js";

const test = presetTest("community-basic");

/**
 * Staff creating a character owned by another member (#424).
 *
 * The create form's ownership picker offers "Owned By..." with a member
 * search, and used to send nothing about the member chosen: the input had no
 * field for it, so the character went to whoever pressed Create. The picker
 * looked like it worked, and the wrong person owned the result. Asserted on
 * the row because the page the form lands on would show the owner the server
 * chose, and the bug was that the server never heard the choice.
 */
test.describe("creating a character for another member", () => {
  test.use({ persona: "moderator" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
    // The picker is only offered to roles that may create characters for
    // somebody other than themselves.
    await world.as("commadmin").gql(SeedUpdateRoleDocument, {
      id: world.roles.moderatorPlus,
      updateRoleInput: { canCreateOrphanedCharacter: true },
    });
  });

  test("the member chosen as owner owns the character", async ({
    page,
    world,
  }) => {
    const owner = world.users.othermember;

    await page.goto(`${world.community.url}/character/create`);
    await page.locator("#name").fill("Made For Another");
    await page.getByText(world.species.name, { exact: true }).first().click();

    // "Owned By..." starts on the moderator themself; swap in the member.
    await page.getByRole("radio", { name: "Owned By..." }).check();
    await page.getByRole("button", { name: "Clear selection" }).click();
    await page
      .getByRole("textbox", { name: "Search for user" })
      .fill(owner.username);
    await page.getByText(owner.username, { exact: true }).first().click();

    await page.getByTestId("submit-character").click();
    await expect(page.getByTestId("create-progress-dialog")).toContainText(
      "is ready",
      { timeout: 30_000 },
    );

    const ownerId = await withClient(CFG.databaseUrl, async (client) => {
      const { rows } = await client.query<{ owner_id: string | null }>(
        `SELECT owner_id FROM characters WHERE name = $1`,
        ["Made For Another"],
      );
      expect(rows).toHaveLength(1);
      return rows[0].owner_id;
    });

    expect(ownerId).toBe(owner.userId);
  });
});
