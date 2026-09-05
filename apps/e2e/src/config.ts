import * as fs from "node:fs";
import * as path from "node:path";

const num = (v: string | undefined, d: number): number => (v ? Number(v) : d);

/**
 * Reserved for future parallelism. Playwright sets TEST_PARALLEL_INDEX per worker;
 * every port and the database name are offset by it, so raising `workers` above 1
 * is a config change rather than a rewrite.
 *
 * This is *within-run* parallelism and is a second, independent axis from the
 * instance slot: the slot (scripts/instance.mjs) separates concurrent worktrees
 * by supplying E2E_* below, and each slot reserves 60 ports for its workers, so
 * the two never interfere. Stride 2 because each worker needs a backend and a
 * frontend port.
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
 * The domain the run is served from. Communities hang off it as subdomains,
 * exactly as they do in production (#339).
 *
 * `e2e.localhost` rather than plain `localhost`, and the extra label is
 * load-bearing in two independent ways:
 *
 *  1. **Cookies.** The session is an `HttpOnly` refresh cookie on the parent
 *     domain, and `SameSite=Lax` means the browser only attaches it to
 *     requests the API's *site* considers first-party. A site is the
 *     registrable domain, and `localhost` is itself a public suffix under the
 *     PSL's default rule -- so `localhost` and `willowmere.localhost` are two
 *     different sites, and a page on one can never send the API's cookie. Add
 *     a label and the registrable domain becomes `e2e.localhost` for the apex,
 *     for `api.e2e.localhost` and for every community, so one sign-in covers
 *     them all. That is the production arrangement, reproduced locally.
 *  2. **Resolution.** Chromium resolves anything ending in `.localhost` to
 *     loopback itself (RFC 6761), so no /etc/hosts entry, no wildcard DNS and
 *     no `--host-resolver-rules` are needed, at any label depth. Vite's host
 *     check allows `.localhost` for the same reason, so the preview server
 *     serves every community host with no extra configuration.
 *
 * Node cannot resolve these names -- glibc has no such rule -- so everything
 * server-side (the seeder, the actor's GraphQL calls, Playwright's readiness
 * polls) talks to `bindHost` below instead. Browser-facing URLs use the domain;
 * process-facing URLs use the loopback address.
 *
 * `e2e.` rather than the dev servers' `dev.localhost` (scripts/instance.mjs)
 * so that a suite run and a browser someone has open on the dev instance are
 * visibly different sites and cannot share a cookie jar -- cookies ignore
 * ports, so the domain is the only thing separating them.
 */
const rootDomain = process.env.E2E_ROOT_DOMAIN ?? "e2e.localhost";

/**
 * The address the servers listen on and that Node connects to. It is NOT what
 * the browser is pointed at -- see `rootDomain`.
 */
const bindHost = process.env.E2E_HOST ?? "127.0.0.1";

const pgHost = process.env.E2E_PG_HOST ?? "localhost";
const pgPort = num(process.env.E2E_PG_PORT, 5440);
const pgUser = process.env.E2E_PG_USER ?? "test_user";
const pgPassword = process.env.E2E_PG_PASSWORD ?? "test_password";

/**
 * A database of our own, not the `chardb_test` the backend Jest suite uses.
 * That one is `prisma db push`-ed and has no _prisma_migrations table, so
 * `migrate deploy` against it would misbehave.
 */
const dbName = `${process.env.E2E_DB_NAME ?? "chardb_e2e_ui"}${idx ? `_p${idx}` : ""}`;

export const CFG = {
  rootDomain,
  bindHost,
  backendPort: num(process.env.E2E_BACKEND_PORT, 4310) + idx * 2,
  frontendPort: num(process.env.E2E_FRONTEND_PORT, 4311) + idx * 2,

  pgHost,
  pgPort,
  pgUser,
  pgPassword,
  dbName,

  /** `preview` serves the real production bundle; `dev` is an escape hatch. */
  frontendMode: (process.env.E2E_FRONTEND_MODE ?? "preview") as
    | "preview"
    | "dev",
  /**
   * Reuse an existing dist instead of rebuilding it.
   *
   * `E2E_SKIP_BUILD=1` covers both servers and is the one to reach for locally
   * when iterating on specs. The two narrower flags exist for CI, which caches
   * the backend and frontend build outputs under separate keys and so can hit
   * on one and miss on the other.
   *
   * Both servers refuse to start if asked to skip a build whose dist is not
   * there, rather than failing later as a missing module.
   */
  skipBackendBuild:
    process.env.E2E_SKIP_BACKEND_BUILD === "1" ||
    process.env.E2E_SKIP_BUILD === "1",
  skipFrontendBuild:
    process.env.E2E_SKIP_FRONTEND_BUILD === "1" ||
    process.env.E2E_SKIP_BUILD === "1",
  /** Keep the database after teardown for post-mortem inspection. */
  keepDb: process.env.E2E_KEEP_DB === "1",
  reuseServers: process.env.E2E_REUSE_SERVERS === "1",

  /** The API as a Node process reaches it. Seeding and readiness polls only. */
  get backendUrl(): string {
    return `http://${this.bindHost}:${this.backendPort}`;
  },
  /**
   * The API as the BROWSER reaches it -- baked into the bundle as
   * VITE_API_URL.
   *
   * A host under `rootDomain`, so the refresh cookie the API sets on the
   * parent domain comes back on every call, from the apex and from every
   * community host alike. Pointing the bundle at `bindHost` instead would put
   * the API on a different site from the pages and silently sign every
   * community host out.
   */
  get browserBackendUrl(): string {
    return `http://api.${this.rootDomain}:${this.backendPort}`;
  },
  /** The frontend as a Node process reaches it. Readiness polls only. */
  get frontendUrl(): string {
    return `http://${this.bindHost}:${this.frontendPort}`;
  },
  /** The site's apex as the browser reaches it. Playwright's `baseURL`. */
  get apexUrl(): string {
    return `http://${this.rootDomain}:${this.frontendPort}`;
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

/**
 * An absolute URL on a community's own host.
 *
 * Absolute rather than a path, because a community page is on a different
 * ORIGIN from Playwright's `baseURL`: `page.goto("/members")` would resolve
 * against the apex and land on the site's 404, not on the community. Presets
 * bake this into the URLs they hand out, and specs use it directly when they
 * need a host a preset does not name.
 */
export const communityUrl = (slug: string, path = ""): string =>
  `http://${slug}.${CFG.rootDomain}:${CFG.frontendPort}${path}`;

/** An absolute URL on the site's apex host. */
export const apexUrl = (path = ""): string => `${CFG.apexUrl}${path}`;

/**
 * A pattern matching any URL that begins with `prefix`.
 *
 * `expect(page).toHaveURL()` matches the whole absolute URL, and now that a
 * community is a host rather than a path prefix, "am I still in this
 * community?" is an assertion about the start of that URL. The prefix is
 * escaped because a hostname is full of dots, which an unescaped RegExp would
 * read as "any character" -- so the assertion says what it appears to say.
 */
export const urlStartingWith = (prefix: string): RegExp =>
  new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
