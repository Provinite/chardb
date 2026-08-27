import { test, expect } from "@playwright/test";
import { CFG } from "../src/config.js";
import { withClient } from "../src/db/sql.js";
import { createSnapshot, restoreSnapshot } from "../src/db/snapshot.js";

/**
 * Guards the one assumption the whole reset design rests on: that TRUNCATE +
 * re-INSERT underneath a running backend does not poison its Prisma connection
 * pool. If this ever fails, the fallback is restarting the backend between spec
 * files -- much slower, so it is worth an explicit test.
 */
test("backend keeps serving across a snapshot restore", async ({ request }) => {
  const gql = async (query: string) =>
    (await request.post(CFG.graphqlUrl, { data: { query } })).json();

  await withClient(CFG.databaseUrl, (c) =>
    c.query(`INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
             VALUES ('pool-1','pooluser','pool@e.local','x', now(), now())`),
  );
  await createSnapshot("pooltest");

  const before = await gql(`{ characters { total } }`);
  expect(before.errors, JSON.stringify(before.errors)).toBeUndefined();

  await restoreSnapshot("pooltest");

  // Same pooled connections, immediately after the tables were replaced.
  const after = await gql(`{ characters { total } }`);
  expect(after.errors, JSON.stringify(after.errors)).toBeUndefined();
  expect(after.data.characters.total).toBe(0);

  const users = await withClient(CFG.databaseUrl, (c) =>
    c.query(`SELECT id FROM users WHERE id = 'pool-1'`),
  );
  expect(users.rowCount).toBe(1);
});
