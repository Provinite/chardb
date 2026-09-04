import pg from "pg";

/**
 * Runs `fn` against a single dedicated connection and always closes it.
 *
 * A single connection matters for the reset path: `SET LOCAL` is scoped to the
 * connection's current transaction, so the GUC changes and the DML they govern
 * must land on the same physical connection. A pool would not guarantee that.
 */
export async function withClient<T>(
  connectionString: string,
  fn: (client: pg.Client) => Promise<T>,
): Promise<T> {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

/** Double-quote a Postgres identifier. */
export const q = (ident: string): string => `"${ident.replace(/"/g, '""')}"`;

/**
 * Every base table in `public`, excluding Prisma's migration bookkeeping.
 *
 * Enumerated at runtime rather than hardcoded so that adding a Prisma model can
 * never silently escape the reset -- a table missing from the TRUNCATE list
 * would otherwise leak rows between spec files.
 */
export async function listPublicTables(client: pg.Client): Promise<string[]> {
  const { rows } = await client.query<{ relname: string }>(`
    SELECT c.relname
    FROM   pg_class c
    JOIN   pg_namespace n ON n.oid = c.relnamespace
    WHERE  n.nspname = 'public'
      AND  c.relkind = 'r'
      AND  c.relname <> '_prisma_migrations'
    ORDER  BY c.relname
  `);
  return rows.map((r) => r.relname);
}

/**
 * The reset transaction sets `session_replication_role = replica` to disable FK
 * triggers, which requires superuser. The postgres:15-alpine image grants that
 * to POSTGRES_USER by default, but fail loudly and specifically if it ever stops
 * being true rather than surfacing a cryptic permission error mid-run.
 */
export async function assertSuperuser(client: pg.Client): Promise<void> {
  const { rows } = await client.query<{ usesuper: boolean }>(
    `SELECT usesuper FROM pg_user WHERE usename = current_user`,
  );
  if (!rows[0]?.usesuper) {
    throw new Error(
      `E2E reset requires a superuser role (it sets session_replication_role to ` +
        `disable FK triggers during restore). Current user is not a superuser.\n` +
        `The postgres-test container grants this to POSTGRES_USER by default -- ` +
        `check that docker/services/postgres-test.yml has not been changed.`,
    );
  }
}
