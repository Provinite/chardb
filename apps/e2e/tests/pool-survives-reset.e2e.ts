import { test, expect } from "../src/fixtures.js";
import { print } from "graphql";
import { CFG } from "../src/config.js";
import { SeedCharacterCountDocument } from "../src/generated/graphql.js";
import { withClient } from "../src/db/sql.js";

test.use({ preset: "community-basic", persona: "anon" });

/**
 * Guards the assumption the whole reset design rests on: that TRUNCATE +
 * re-INSERT underneath a running backend does not poison its Prisma connection
 * pool. If this ever regresses the fallback is restarting the backend between
 * spec files, which is far slower -- so it is worth an explicit test.
 *
 * Doubles as an end-to-end check that a reset is actually visible through the
 * API, not just in the database.
 */
test("backend keeps serving across a snapshot restore", async ({
  request,
  world,
}) => {
  const total = async (): Promise<number> => {
    const res = await request.post(CFG.graphqlUrl, {
      data: { query: print(SeedCharacterCountDocument) },
    });
    const body = await res.json();
    expect(body.errors, JSON.stringify(body.errors)).toBeUndefined();
    return body.data.characters.total;
  };

  const before = await total();
  expect(before).toBeGreaterThan(0);

  // The one deliberate out-of-band write in the suite. Going behind the API is
  // the point here, not a shortcut: it proves the backend observes changes it
  // did not make itself, rather than serving a cached view. Every assertion
  // about application behavior goes through the API or the UI.
  await withClient(CFG.databaseUrl, (c) =>
    c.query(`DELETE FROM characters WHERE id = $1`, [
      world.characters.plain.id,
    ]),
  );
  expect(await total()).toBe(before - 1);

  // Full TRUNCATE + restore of all 33 tables, on the same pooled connections.
  await world.reset();

  expect(await total()).toBe(before);
});
