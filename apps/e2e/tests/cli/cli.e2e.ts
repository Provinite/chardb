import { execFile } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { presetTest, expect } from "../../src/fixtures.js";
import { CFG, REPO_ROOT } from "../../src/config.js";
import { SeedCreateAccessTokenDocument } from "../../src/generated/graphql.js";

const run = promisify(execFile);

const test = presetTest("community-items");

/**
 * The `yarn chardb` CLI (apps/cli), run as a script would run it: through the
 * root script, with a token in CHARDB_TOKEN, against a real backend. What each
 * command sends and prints is unit-tested in apps/cli; this proves the whole
 * path holds together.
 */
test.describe("chardb CLI", () => {
  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("a token reads itself, lists item types and grants items", async ({
    world,
  }) => {
    const { createPersonalAccessToken: made } = await world
      .as("siteadmin")
      .gql(SeedCreateAccessTokenDocument, {
        input: {
          name: "e2e cli",
          expiresInDays: 7,
          communities: [
            {
              communityId: world.community.id,
              member: false,
              permissions: ["canGrantItems"],
            },
          ],
        },
      });

    const chardb = async (...args: string[]) => {
      const { stdout } = await run("yarn", ["chardb", ...args, "--json"], {
        // Yarn runs a root script from inside another workspace only when its
        // name has a colon in it.
        cwd: REPO_ROOT,
        env: {
          ...process.env,
          CHARDB_TOKEN: made.secret,
          CHARDB_API_URL: CFG.graphqlUrl,
          // Never the person's own stored tokens.
          XDG_CONFIG_HOME: mkdtempSync(join(tmpdir(), "chardb-cli-e2e-")),
        },
      });
      return JSON.parse(stdout) as unknown;
    };

    expect(await chardb("whoami")).toMatchObject({
      environment: "local",
      user: { username: world.users.siteadmin.username },
      token: {
        name: "e2e cli",
        communities: [
          {
            community: { slug: world.community.slug },
            member: false,
            permissions: ["canGrantItems"],
          },
        ],
      },
    });

    const types = (await chardb(
      "items",
      "types",
      "--community",
      world.community.slug,
    )) as { itemTypes: Array<{ id: string; name: string }> };
    expect(types.itemTypes).toContainEqual(
      expect.objectContaining(world.itemTypes.potion),
    );

    const member = world.users.member;
    expect(
      await chardb(
        "items",
        "grant",
        "--type",
        world.itemTypes.potion.id,
        "--user",
        member.username,
        "--quantity",
        "2",
        "--reason",
        "CLI e2e",
      ),
    ).toEqual({
      items: [
        expect.objectContaining({ ownerId: member.userId }),
        expect.objectContaining({ ownerId: member.userId }),
      ],
    });

    expect(
      await chardb(
        "items",
        "grant",
        "--type",
        world.itemTypes.potion.id,
        "--pending",
        "deviantart:cli-e2e-artist",
      ),
    ).toEqual({ items: [expect.objectContaining({ ownerId: null })] });
  });
});
