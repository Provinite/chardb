import type pg from "pg";
import { CFG } from "../config.js";
import { assertSuperuser, listPublicTables, q, withClient } from "./sql.js";

const schemaFor = (preset: string): string =>
  `snap_${preset.replace(/[^a-zA-Z0-9_]/g, "_")}`;

/**
 * Copies every public table into a parallel schema, to be restored verbatim
 * before each spec file.
 *
 * `CREATE TABLE ... AS TABLE` preserves column order and types (including jsonb
 * and the schema's enum types) and copies no constraints or indexes -- exactly
 * what a data-only snapshot wants.
 *
 * Restoring rows rather than re-running the seeder is what keeps UUIDs stable
 * across spec files. That in turn keeps the seeded world handle, the minted
 * JWTs (which encode `sub`), the storageState files, and every
 * `a[href="/character/<uuid>"]` selector valid for the whole run.
 */
export async function createSnapshot(preset: string): Promise<void> {
  const schema = schemaFor(preset);
  await withClient(CFG.databaseUrl, async (client) => {
    const tables = await listPublicTables(client);
    await client.query(`DROP SCHEMA IF EXISTS ${q(schema)} CASCADE`);
    await client.query(`CREATE SCHEMA ${q(schema)}`);
    for (const t of tables) {
      await client.query(
        `CREATE TABLE ${q(schema)}.${q(t)} AS TABLE ${q("public")}.${q(t)}`,
      );
    }
  });
}

async function restoreOnce(client: pg.Client, schema: string): Promise<void> {
  const tables = await listPublicTables(client);
  const list = tables.map((t) => `${q("public")}.${q(t)}`).join(", ");

  await client.query("BEGIN");
  try {
    // Bound the ACCESS EXCLUSIVE wait so a stray in-flight request surfaces as a
    // clean retry rather than hanging the suite.
    await client.query(`SET LOCAL lock_timeout = '5s'`);
    // Disables FK triggers for this transaction. Required, not merely
    // convenient: every FK in this schema is NOT DEFERRABLE (so
    // `SET CONSTRAINTS ALL DEFERRED` is a no-op), and the FK graph contains
    // cycles -- users<->images, characters<->media, comments->comments -- so no
    // topological insert order exists. SET LOCAL reverts on COMMIT or ROLLBACK,
    // so a failure can never leave the connection with FK enforcement off.
    await client.query(`SET LOCAL session_replication_role = 'replica'`);

    // One multi-table TRUNCATE. Deliberately no CASCADE: every table is in the
    // list, so CASCADE is unnecessary, and omitting it means a table missing
    // from the enumeration fails loudly instead of silently widening the wipe.
    // No RESTART IDENTITY either -- the schema has no sequences (all PKs are uuid).
    await client.query(`TRUNCATE TABLE ${list}`);

    for (const t of tables) {
      await client.query(
        `INSERT INTO ${q("public")}.${q(t)} SELECT * FROM ${q(schema)}.${q(t)}`,
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  }
}

/**
 * Restores the snapshot. Called once per spec file by the `world` fixture, and
 * exported so an individual spec can opt into stricter per-test isolation:
 *
 *   test.beforeEach(async ({ world }) => { await world.reset(); });
 */
export async function restoreSnapshot(preset: string): Promise<void> {
  const schema = schemaFor(preset);
  await withClient(CFG.databaseUrl, async (client) => {
    await assertSuperuser(client);
    try {
      await restoreOnce(client, schema);
    } catch (err) {
      // 55P03 lock_not_available: something was still holding a lock. The reset
      // runs before the page fixture, so this should be rare; one retry removes
      // the residual flake.
      if ((err as { code?: string }).code === "55P03") {
        await restoreOnce(client, schema);
        return;
      }
      throw err;
    }
  });
}

export async function snapshotExists(preset: string): Promise<boolean> {
  const schema = schemaFor(preset);
  return withClient(CFG.databaseUrl, async (client) => {
    const { rowCount } = await client.query(
      `SELECT 1 FROM pg_namespace WHERE nspname = $1`,
      [schema],
    );
    return rowCount === 1;
  });
}

export async function dropSnapshots(): Promise<void> {
  await withClient(CFG.databaseUrl, async (client) => {
    const { rows } = await client.query<{ nspname: string }>(
      `SELECT nspname FROM pg_namespace WHERE nspname LIKE 'snap\\_%'`,
    );
    for (const { nspname } of rows) {
      await client.query(`DROP SCHEMA IF EXISTS ${q(nspname)} CASCADE`);
    }
  });
}

/**
 * Empties every public table. Used before building a preset so that presets
 * never stack on one another -- which also means the globally-unique
 * Community.name / Species.name constraints can never collide between presets.
 */
export async function truncateAll(): Promise<void> {
  await withClient(CFG.databaseUrl, async (client) => {
    const tables = await listPublicTables(client);
    const list = tables.map((t) => `${q("public")}.${q(t)}`).join(", ");
    await client.query(`TRUNCATE TABLE ${list}`);
  });
}
