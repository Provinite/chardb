import * as fs from "node:fs";
import * as path from "node:path";

const num = (v: string | undefined, d: number): number => (v ? Number(v) : d);

/**
 * Reserved for future parallelism. Playwright sets TEST_PARALLEL_INDEX per worker;
 * every port and the database name are offset by it, so raising `workers` above 1
 * is a config change rather than a rewrite.
 */
const idx = num(process.env.TEST_PARALLEL_INDEX, 0);

/**
 * Walks up from cwd to the workspace root.
 *
 * Deliberately avoids `import.meta.url` and `__dirname`: this module is loaded
 * both by tsx as ESM (the server scripts) and by Playwright, which transpiles
 * its config to CJS. Neither construct works in both.
 */
function findRepoRoot(): string {
  let dir = process.cwd();
  for (;;) {
    const pkg = path.join(dir, "package.json");
    if (fs.existsSync(pkg)) {
      try {
        if (JSON.parse(fs.readFileSync(pkg, "utf8")).workspaces) return dir;
      } catch {
        // keep walking
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(
        "Could not locate the workspace root from " + process.cwd(),
      );
    }
    dir = parent;
  }
}

export const REPO_ROOT = findRepoRoot();
export const E2E_ROOT = path.resolve(REPO_ROOT, "apps/e2e");
export const ARTIFACTS = path.resolve(E2E_ROOT, ".artifacts");

/**
 * `host` is the single source of truth for both Playwright's `baseURL` and the
 * `origin` written into storageState files. They must match exactly -- localhost
 * and 127.0.0.1 are different origins, and a mismatch silently drops the
 * localStorage entries, leaving tests mysteriously logged out.
 */
const host = process.env.E2E_HOST ?? "127.0.0.1";

const pgHost = process.env.E2E_PG_HOST ?? "localhost";
const pgPort = num(process.env.E2E_PG_PORT, 5440);
const pgUser = process.env.E2E_PG_USER ?? "test_user";
const pgPassword = process.env.E2E_PG_PASSWORD ?? "test_password";

/**
 * A database of our own, not the `chardb_test` the backend Jest suite uses.
 * That one is `prisma db push`-ed and has no _prisma_migrations table, so
 * `migrate deploy` against it would misbehave.
 */
const dbName = `${process.env.E2E_DB_NAME ?? "chardb_e2e_ui"}${idx ? `_w${idx}` : ""}`;

export const CFG = {
  host,
  backendPort: num(process.env.E2E_BACKEND_PORT, 4310) + idx * 10,
  frontendPort: num(process.env.E2E_FRONTEND_PORT, 4311) + idx * 10,

  pgHost,
  pgPort,
  pgUser,
  pgPassword,
  dbName,

  /** `preview` serves the real production bundle; `dev` is an escape hatch. */
  frontendMode: (process.env.E2E_FRONTEND_MODE ?? "preview") as
    | "preview"
    | "dev",
  /** Reuse apps/frontend/dist instead of rebuilding -- fast spec iteration. */
  skipBuild: process.env.E2E_SKIP_BUILD === "1",
  /** Keep the database after teardown for post-mortem inspection. */
  keepDb: process.env.E2E_KEEP_DB === "1",
  reuseServers: process.env.E2E_REUSE_SERVERS === "1",

  get backendUrl(): string {
    return `http://${this.host}:${this.backendPort}`;
  },
  get frontendUrl(): string {
    return `http://${this.host}:${this.frontendPort}`;
  },
  get graphqlUrl(): string {
    return `${this.backendUrl}/graphql`;
  },
  get databaseUrl(): string {
    return `postgresql://${this.pgUser}:${this.pgPassword}@${this.pgHost}:${this.pgPort}/${this.dbName}`;
  },
  /** Maintenance connection, for CREATE/DROP DATABASE. */
  get adminUrl(): string {
    return `postgresql://${this.pgUser}:${this.pgPassword}@${this.pgHost}:${this.pgPort}/postgres`;
  },
};
