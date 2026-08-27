import { test, expect } from "../src/fixtures.js";
import { CFG } from "../src/config.js";
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
      data: { query: `{ characters { total } }` },
    });
    const body = await res.json();
    expect(body.errors, JSON.stringify(body.errors)).toBeUndefined();
    return body.data.characters.total;
  };

  const before = await total();
  expect(before).toBeGreaterThan(0);

  // Mutate underneath the backend, then confirm it observes the change --
  // proving the reads are not being served from a stale cache.
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
