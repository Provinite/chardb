#!/usr/bin/env node
/**
 * Instance slot allocation.
 *
 * Every local instance of the stack gets a "slot": a small integer that offsets
 * every host port, database name and docker compose project name, so N agents
 * can run N copies of the app and N e2e runs concurrently without colliding.
 *
 * A checkout is a checkout. Separate clones and linked worktrees are peers,
 * keyed by absolute path -- nothing here assumes the copies share a .git.
 *
 * Slot 0 is the legacy instance: it reproduces the exact ports, database names
 * and compose project that existed before this file, so the checkout a human
 * has bookmarked at localhost:3000 (and registered OAuth callbacks against)
 * keeps working untouched. Only a standalone checkout can hold it; slots >= 1
 * live in a contiguous 100-port block each.
 *
 * Usage:
 *   node scripts/instance.mjs              # human-readable table
 *   node scripts/instance.mjs --json       # machine-readable
 *   node scripts/instance.mjs --env        # KEY=VALUE lines, for dotenv/eval
 *   node scripts/instance.mjs --list       # every claimed slot on this machine
 *   node scripts/instance.mjs --claim 0    # take a specific slot for this checkout
 *   node scripts/instance.mjs --release    # give this checkout's slot back
 *   node scripts/instance.mjs --prune      # free slots whose checkout is gone
 *   node scripts/instance.mjs --reset      # free every slot on this machine
 *   ...either with --stop                  # also stop what those slots left running
 *
 * See docs/PARALLEL_INSTANCES.md.
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { findInstanceServers, stopProcesses } from "./lib/processes.mjs";

/** How many concurrent checkouts the port layout reserves room for. */
export const SLOT_COUNT = Number(process.env.CHARDB_SLOTS ?? 16);

/** Slots >= 1 each own [BLOCK_BASE + slot*100, +100). Well below ip_local_port_range. */
const BLOCK_BASE = 20000;
const BLOCK_SIZE = 100;

/**
 * Port layout. `legacy` is what slot 0 uses -- today's hardcoded value, kept
 * byte-for-byte. `offset` is the position within a slot's block for every
 * other slot.
 *
 * Offsets 40+ are reserved for e2e worker fan-out: Playwright's
 * TEST_PARALLEL_INDEX adds `worker * 2` on top of the e2e ports, so raising
 * `workers` above 1 stays inside the block (up to 30 workers).
 */
const PORTS = {
  frontend: { legacy: 3000, offset: 0 },
  backend: { legacy: 4000, offset: 1 },
  postgres: { legacy: 5433, offset: 2 },
  postgresTest: { legacy: 5440, offset: 3 },
  localstack: { legacy: 4566, offset: 4 },
  e2eBackend: { legacy: 4310, offset: 40 },
  e2eFrontend: { legacy: 4311, offset: 41 },
};

/**
 * The compose project name slot 0 must keep. Before this file existed, no
 * project name was set, so compose derived it from the compose file's
 * directory -- `docker`. Its volume is therefore `docker_postgres_data`.
 * Setting anything else here orphans the slot-0 checkout's database.
 */
const LEGACY_COMPOSE_PROJECT = "docker";

/**
 * The root domain the browser suite serves itself from. Mirrors the default in
 * `apps/e2e/src/config.ts`, which is where it is actually read; this copy only
 * exists so `yarn instance` can print the right hosts.
 */
const E2E_ROOT_DOMAIN = process.env.E2E_ROOT_DOMAIN ?? "e2e.localhost";

// ---------------------------------------------------------------- registry

const REGISTRY_DIR =
  process.env.CHARDB_REGISTRY_DIR ?? path.join(os.homedir(), ".chardb");
const REGISTRY_FILE = path.join(REGISTRY_DIR, "instances.json");
const LOCK_FILE = path.join(REGISTRY_DIR, "instances.lock");

/** A lock older than this is assumed to belong to a process that died holding it. */
const LOCK_STALE_MS = 30_000;
const LOCK_TIMEOUT_MS = 10_000;

function sleepSync(ms) {
  // Atomics.wait on a fresh SharedArrayBuffer is the only portable synchronous
  // sleep in Node. Busy-waiting on Date.now() would spin a core while another
  // process is trying to finish the work we are waiting for.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Runs `fn` holding an exclusive cross-process lock on the registry.
 *
 * This is the part that makes concurrent agents safe: two `yarn dev`
 * invocations starting in the same second must not both read "slot 3 is free"
 * and both claim it. The whole read-modify-write happens under the lock.
 */
function withLock(fn) {
  fs.mkdirSync(REGISTRY_DIR, { recursive: true });
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  let fd;
  for (;;) {
    try {
      fd = fs.openSync(LOCK_FILE, "wx");
      break;
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
      let age = Infinity;
      try {
        age = Date.now() - fs.statSync(LOCK_FILE).mtimeMs;
      } catch {
        // The holder released it between openSync and statSync; retry.
        continue;
      }
      if (age > LOCK_STALE_MS) {
        // Breaking a stale lock is safe here because every write below is an
        // atomic rename -- a half-written registry is not reachable.
        try {
          fs.unlinkSync(LOCK_FILE);
        } catch {
          /* someone else broke it first */
        }
        continue;
      }
      if (Date.now() > deadline) {
        throw new Error(
          `Timed out waiting for the instance registry lock (${LOCK_FILE}). ` +
            `If no other chardb process is starting, delete that file.`,
        );
      }
      sleepSync(50);
    }
  }
  try {
    fs.writeSync(fd, String(process.pid));
    return fn();
  } finally {
    fs.closeSync(fd);
    try {
      fs.unlinkSync(LOCK_FILE);
    } catch {
      /* already broken by a stale-lock reaper */
    }
  }
}

function readRegistry() {
  try {
    const parsed = JSON.parse(fs.readFileSync(REGISTRY_FILE, "utf8"));
    return parsed && typeof parsed.slots === "object" && parsed.slots !== null
      ? parsed
      : { slots: {} };
  } catch {
    // Missing or corrupt. A corrupt registry is recoverable -- worst case every
    // live worktree re-claims its pinned slot from its own .instance.json.
    return { slots: {} };
  }
}

function writeRegistry(registry) {
  fs.mkdirSync(REGISTRY_DIR, { recursive: true });
  const tmp = `${REGISTRY_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(registry, null, 2) + "\n");
  fs.renameSync(tmp, REGISTRY_FILE);
}

/** Every claimed slot, lowest first. Paths may no longer exist on disk. */
export function listClaims() {
  return Object.entries(withLock(() => readRegistry()).slots)
    .map(([slot, info]) => ({ slot: Number(slot), path: info.path }))
    .sort((a, b) => a.slot - b.slot);
}

// ------------------------------------------------------------ resolution

/** FNV-1a. Stable across Node versions, unlike anything involving Math.random. */
function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** The checkout root: the directory holding the workspace package.json. */
export function findRepoRoot(from = process.cwd()) {
  let dir = path.resolve(from);
  for (;;) {
    const pkg = path.join(dir, "package.json");
    if (fs.existsSync(pkg)) {
      try {
        if (JSON.parse(fs.readFileSync(pkg, "utf8")).workspaces) return dir;
      } catch {
        // Not the workspace root, or unparseable. Keep walking.
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(`Could not locate the workspace root from ${from}`);
    }
    dir = parent;
  }
}

/**
 * The checkout `root` is a linked worktree OF, or null when `root` is a
 * standalone checkout (a plain clone, or the primary of its own worktrees).
 *
 * `--git-common-dir` points at the shared .git of the main checkout from any
 * linked worktree, so its parent is that worktree's primary working tree.
 * Inside a standalone checkout it points at the checkout's own .git, and the
 * parent is `root` itself.
 */
export function findPrimaryCheckout(root) {
  try {
    const common = execFileSync("git", ["rev-parse", "--git-common-dir"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const primary = path.dirname(path.resolve(root, common));
    return primary === root ? null : primary;
  } catch {
    return null;
  }
}

const pinPath = (root) => path.join(root, ".instance.json");

function readPin(root) {
  try {
    const pin = JSON.parse(fs.readFileSync(pinPath(root), "utf8"));
    return Number.isInteger(pin.slot) && pin.path === root ? pin : null;
  } catch {
    return null;
  }
}

/**
 * Claims a slot for `root`, under the registry lock.
 *
 * Every checkout is a peer here -- a separate clone and a linked worktree are
 * treated the same way, keyed by absolute path -- with one asymmetry:
 *
 * **Only a standalone checkout may hold slot 0.** A linked worktree never
 * takes it, because the checkout it was created from is the natural owner of
 * the legacy ports, database names and compose project. Among standalone
 * checkouts it is first come, first served, made sticky by the pin file; use
 * `--claim 0` to move it deliberately.
 *
 * Preference order:
 *   1. `pinned`, if the registry agrees it is ours (or nobody live holds it).
 *   2. hash(root) -- stable, so a checkout keeps its ports across reboots.
 *   3. the next free slot, scanning upward from the hash with wraparound.
 *
 * A slot held by a path that no longer exists on disk is reclaimed: deleting a
 * checkout frees its slot without any explicit cleanup step.
 */
function claimSlot(root, pinned, canTakeZero, forced = null) {
  return withLock(() => {
    const registry = readRegistry();
    const heldBy = (slot) => registry.slots[String(slot)]?.path;
    const isFree = (slot) => {
      const owner = heldBy(slot);
      return !owner || owner === root || !fs.existsSync(owner);
    };
    const claimable = (slot) =>
      slot !== null && (slot !== 0 || canTakeZero) && isFree(slot);

    let slot = null;
    if (forced !== null) {
      if (!isFree(forced)) {
        throw new Error(
          `Instance slot ${forced} is held by ${heldBy(forced)}. ` +
            `Run \`yarn instance:release\` there first.`,
        );
      }
      if (forced === 0 && !canTakeZero) {
        throw new Error(
          `Instance slot 0 keeps the legacy ports and belongs to a standalone ` +
            `checkout, not a linked worktree. Claim it from ${findPrimaryCheckout(root)}.`,
        );
      }
      slot = forced;
    } else if (claimable(pinned ?? null)) {
      slot = pinned;
    } else if (canTakeZero && isFree(0)) {
      // A standalone checkout prefers slot 0 while it is going spare, so a lone
      // clone behaves exactly like the primary checkout always has.
      slot = 0;
    } else {
      // Everything else lives in 1..SLOT_COUNT-1.
      const span = SLOT_COUNT - 1;
      const preferred = (hash(root) % span) + 1;
      for (let i = 0; i < span; i++) {
        const candidate = ((preferred - 1 + i) % span) + 1;
        if (isFree(candidate)) {
          slot = candidate;
          break;
        }
      }
    }

    if (slot === null) {
      const occupants = Object.entries(registry.slots)
        .map(([s, v]) => `  ${s}: ${v.path}`)
        .join("\n");
      throw new Error(
        `All ${SLOT_COUNT - 1} non-legacy instance slots are claimed by live checkouts:\n${occupants}\n` +
          `Free one with \`yarn instance:release\` in that checkout, delete it, ` +
          `or raise CHARDB_SLOTS.`,
      );
    }

    registry.slots[String(slot)] = {
      path: root,
      updatedAt: new Date().toISOString(),
    };
    writeRegistry(registry);
    return slot;
  });
}

/**
 * Resolves this worktree's slot and everything derived from it.
 *
 * `CHARDB_INSTANCE` short-circuits the registry entirely -- an explicit
 * override always wins, including in CI where every job has its own machine
 * and the registry is pointless.
 */
export function resolveInstance({ cwd = process.cwd(), claim = null } = {}) {
  const root = findRepoRoot(cwd);

  let slot;
  if (claim === null && process.env.CHARDB_INSTANCE !== undefined) {
    slot = Number(process.env.CHARDB_INSTANCE);
    if (!Number.isInteger(slot) || slot < 0) {
      throw new Error(
        `CHARDB_INSTANCE must be a non-negative integer, got "${process.env.CHARDB_INSTANCE}"`,
      );
    }
  } else {
    // A linked worktree may not hold slot 0; a standalone checkout -- a plain
    // clone, or the primary of its own worktrees -- may.
    const canTakeZero = findPrimaryCheckout(root) === null;
    // A pin whose slot has since been taken by another live checkout is simply
    // not honoured by claimSlot, so a stale pin self-heals.
    const pin = readPin(root);
    slot = claimSlot(root, pin?.slot ?? null, canTakeZero, claim);
    if (pin?.slot !== slot) {
      fs.writeFileSync(
        pinPath(root),
        JSON.stringify({ slot, path: root }, null, 2) + "\n",
      );
    }
  }

  return describe(slot, root);
}

/** Pure: slot -> every derived port, name and env var. No I/O. */
export function describe(slot, root = null) {
  const port = (key) => {
    const { legacy, offset } = PORTS[key];
    return slot === 0 ? legacy : BLOCK_BASE + slot * BLOCK_SIZE + offset;
  };
  // Docker/AWS resource names take a dash; postgres identifiers take an
  // underscore. Both are empty on slot 0 so nothing there is renamed.
  const dash = slot === 0 ? "" : `-w${slot}`;
  const under = slot === 0 ? "" : `_w${slot}`;

  const ports = {
    frontend: port("frontend"),
    backend: port("backend"),
    postgres: port("postgres"),
    postgresTest: port("postgresTest"),
    localstack: port("localstack"),
    e2eBackend: port("e2eBackend"),
    e2eFrontend: port("e2eFrontend"),
  };

  const names = {
    composeProject: slot === 0 ? LEGACY_COMPOSE_PROJECT : `chardb-w${slot}`,
    devDatabase: `chardb_dev${under}`,
    testDatabase: `chardb_test${under}`,
    e2eDatabase: `chardb_e2e_ui${under}`,
    otelService: `chardb-backend${dash}`,
    // Not instance-scoped -- see the LocalStack note in `env` below.
    imagesBucket: "chardb-images",
    prizeQueue: "chardb-prize-distribution",
  };

  // The domain communities hang off locally: `willowmere.dev.localhost`.
  //
  // A spare label, not bare `localhost`, and the reason is `SameSite=Lax` on
  // the refresh cookie. `localhost` is a public suffix, so `api.localhost` and
  // `willowmere.localhost` would be different *sites* and the browser would
  // never attach the cookie to a call made from a community host -- every
  // subdomain would appear signed out. Under `dev.localhost` they are one
  // site, exactly as `api.chardb.cc` and `willowmere.chardb.cc` are in
  // production. Every `*.localhost` label resolves to loopback with no
  // /etc/hosts entry, so this costs nothing to set up.
  const rootDomain = process.env.CHARDB_ROOT_DOMAIN ?? "dev.localhost";

  // Served from `api.` under the root domain for the same reason: the cookie
  // is scoped to the domain, and it has to reach the API.
  const backendUrl = `http://api.${rootDomain}:${ports.backend}`;
  const frontendUrl = `http://${rootDomain}:${ports.frontend}`;
  const localstackUrl = `http://localhost:${ports.localstack}`;

  const env = {
    CHARDB_INSTANCE: String(slot),

    COMPOSE_PROJECT_NAME: names.composeProject,

    // Dev servers. PORT is what apps/backend/src/main.ts reads.
    PORT: String(ports.backend),
    BACKEND_PORT: String(ports.backend),
    FRONTEND_PORT: String(ports.frontend),
    FRONTEND_URL: frontendUrl,
    VITE_API_URL: backendUrl,
    // The apex the frontend compares `window.location.hostname` against, and
    // the domain the backend pins the refresh cookie to. Both sides must agree
    // or the session does not survive a page load.
    ROOT_DOMAIN: rootDomain,
    VITE_ROOT_DOMAIN: rootDomain,
    // Read by packages/database's persona seeder and the da-import CLI, which
    // talk to the backend over HTTP rather than to the database directly.
    GRAPHQL_ENDPOINT: `${backendUrl}/graphql`,

    // Dev database.
    POSTGRES_PORT: String(ports.postgres),
    POSTGRES_DB: names.devDatabase,
    DATABASE_URL: `postgresql://chardb:chardb_password@localhost:${ports.postgres}/${names.devDatabase}`,

    // Backend jest e2e suites (apps/backend/test).
    POSTGRES_TEST_PORT: String(ports.postgresTest),
    TEST_DATABASE_URL: `postgresql://test_user:test_password@localhost:${ports.postgresTest}/${names.testDatabase}`,
    POSTGRES_TEST_DB: names.testDatabase,

    // Browser e2e suite (apps/e2e). Consumed by apps/e2e/src/config.ts.
    E2E_BACKEND_PORT: String(ports.e2eBackend),
    E2E_FRONTEND_PORT: String(ports.e2eFrontend),
    E2E_PG_PORT: String(ports.postgresTest),
    E2E_DB_NAME: names.e2eDatabase,

    // LocalStack (S3 + SQS).
    //
    // Only the port is instance-scoped. The bucket and queue keep their stock
    // names deliberately: each instance runs its own LocalStack holding exactly
    // one of each, so a per-instance name would buy no isolation and would mean
    // two places -- init-aws.sh, which creates them, and the backend, which
    // uses them -- had to agree about a string. When they disagreed, the
    // backend crashed at boot polling a queue that did not exist.
    LOCALSTACK_PORT: String(ports.localstack),
    AWS_ENDPOINT_URL: localstackUrl,
    CLOUDFRONT_IMAGES_DOMAIN: `localhost:${ports.localstack}/${names.imagesBucket}`,
    AWS_SQS_QUEUE_URL: `${localstackUrl}/000000000000/${names.prizeQueue}`,

    // Observability is shared across instances (one Jaeger for the machine),
    // so the service name is what keeps each instance's traces apart.
    OTEL_SERVICE_NAME: names.otelService,

    // OAuth callbacks must match the backend this instance actually serves.
    DEVIANTART_CALLBACK_URL: `${backendUrl}/auth/deviantart/callback`,
    DISCORD_CALLBACK_URL: `${backendUrl}/auth/discord/callback`,
    TOYHOUSE_CALLBACK_URL: `${backendUrl}/auth/toyhouse/callback`,
  };

  return {
    slot,
    root,
    ports,
    names,
    urls: { backendUrl, frontendUrl, localstackUrl },
    env,
  };
}

// --------------------------------------------------------------- cleanup

/**
 * Compose projects on this machine that no live checkout claims.
 *
 * Derived from docker rather than from the registry, so it also catches
 * projects whose slot was already reclaimed by a newer checkout. Slot 0's
 * project is `docker`, which cannot match `chardb-w<n>` -- the legacy
 * instance's containers and its postgres_data volume are structurally out of
 * reach here, and the explicit guard below says so.
 */
function findOrphanedProjects() {
  let running;
  try {
    running = execFileSync(
      "docker",
      ["ps", "-a", "--format", '{{.Label "com.docker.compose.project"}}'],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
  } catch {
    return null; // no docker on this machine, or the daemon is down
  }

  const live = new Set(
    listClaims()
      .filter((claim) => fs.existsSync(claim.path))
      .map((claim) => describe(claim.slot).names.composeProject),
  );

  return [...new Set(running.split("\n").map((line) => line.trim()))]
    .filter((project) => /^chardb-w\d+$/.test(project))
    .filter((project) => project !== LEGACY_COMPOSE_PROJECT)
    .filter((project) => !live.has(project))
    .sort();
}

/**
 * Dev servers still holding the ports of slots we just freed.
 *
 * These are the ones nothing else will ever clean up: the checkout is gone or
 * abandoned, so no `yarn instance:down` will ever be run from it, and the
 * process outlives whatever started it.
 */
function reapOrphanedServers(dropped, remove) {
  const stray = [];
  for (const { slot, path: freed } of dropped) {
    const { ports } = describe(slot);
    stray.push(
      ...findInstanceServers(
        [ports.frontend, ports.backend, ports.e2eBackend, ports.e2eFrontend],
        freed,
        // The checkout is gone, so a leftover server cannot prove it came from
        // there -- but nothing else can be listening on that slot's ports.
        { orphaned: !fs.existsSync(freed) },
      ),
    );
  }
  if (stray.length === 0) return;

  if (!remove) {
    console.log(`\n${stray.length} dev server(s) still on freed ports:`);
    for (const { pid, port } of stray)
      console.log(`  pid ${pid}  port ${port}`);
    console.log("Re-run with --stop to stop them too.");
    return;
  }
  for (const { pid, port } of stray) {
    console.log(`stopping  pid ${pid}  (port ${port})`);
  }
  stopProcesses(stray);
}

/** Lists orphaned compose projects, and tears them down when asked to. */
function reportOrphanedProjects(remove) {
  const orphans = findOrphanedProjects();
  if (orphans === null) {
    console.log("\nSkipped the docker check: no reachable docker daemon.");
    return;
  }
  if (orphans.length === 0) {
    console.log("\nNo orphaned compose projects.");
    return;
  }

  if (!remove) {
    console.log(
      `\n${orphans.length} orphaned compose project(s) still hold containers:`,
    );
    for (const project of orphans) console.log(`  ${project}`);
    console.log("Re-run with --stop to remove them and their volumes.");
    return;
  }

  for (const project of orphans) {
    console.log(`\nremoving ${project}`);
    execFileSync("docker", ["compose", "-p", project, "down", "-v"], {
      stdio: "inherit",
    });
  }
}

// ------------------------------------------------------------------- cli

function main(argv) {
  const has = (flag) => argv.includes(flag);
  const root = findRepoRoot();

  const claimAt = argv.indexOf("--claim");
  let claim = null;
  if (claimAt !== -1) {
    claim = Number(argv[claimAt + 1]);
    if (!Number.isInteger(claim) || claim < 0) {
      throw new Error("--claim takes a non-negative integer slot number");
    }
  }

  if (has("--list")) {
    const claims = listClaims();
    if (claims.length === 0) {
      console.log("No slots claimed.");
      return;
    }
    for (const { slot, path: claimed } of claims) {
      const live = fs.existsSync(claimed) ? "" : "  (stale, will be reclaimed)";
      console.log(`${String(slot).padStart(2)}  ${claimed}${live}`);
    }
    return;
  }

  if (has("--release")) {
    withLock(() => {
      const registry = readRegistry();
      for (const [slot, info] of Object.entries(registry.slots)) {
        if (info.path === root) delete registry.slots[slot];
      }
      writeRegistry(registry);
    });
    try {
      fs.unlinkSync(pinPath(root));
    } catch {
      /* nothing pinned */
    }
    console.log(`Released the instance slot held by ${root}`);
    return;
  }

  if (has("--prune") || has("--reset")) {
    const all = has("--reset");
    const dropped = withLock(() => {
      const registry = readRegistry();
      const out = [];
      for (const [slot, info] of Object.entries(registry.slots)) {
        if (all || !fs.existsSync(info.path)) {
          out.push({ slot: Number(slot), path: info.path });
          delete registry.slots[slot];
        }
      }
      writeRegistry(registry);
      return out;
    });

    if (dropped.length === 0) console.log("No slots to free.");
    for (const { slot, path: freed } of dropped) {
      console.log(`freed  ${String(slot).padStart(2)}  ${freed}`);
    }
    if (all) {
      // Pin files elsewhere survive, and that is deliberate: every checkout
      // re-claims the slot it had, so a reset costs nothing but the orphans.
      try {
        fs.unlinkSync(pinPath(root));
      } catch {
        /* nothing pinned here */
      }
    }

    reapOrphanedServers(dropped, has("--stop"));
    reportOrphanedProjects(has("--stop"));
    return;
  }

  const instance = resolveInstance({ claim });

  if (has("--json")) {
    console.log(JSON.stringify(instance, null, 2));
    return;
  }

  if (has("--env")) {
    for (const [k, v] of Object.entries(instance.env)) console.log(`${k}=${v}`);
    return;
  }

  const { slot, ports, names, urls } = instance;
  const rows = [
    ["slot", String(slot) + (slot === 0 ? "  (legacy)" : "")],
    ["checkout", instance.root],
    ["compose project", names.composeProject],
    ["frontend", urls.frontendUrl],
    ["backend", urls.backendUrl],
    ["postgres", `localhost:${ports.postgres}/${names.devDatabase}`],
    [
      "postgres (test)",
      `localhost:${ports.postgresTest}/${names.testDatabase}`,
    ],
    ["localstack", urls.localstackUrl],
    // The browser suite runs under its own root domain (see apps/e2e's
    // config.ts) for the same SameSite reason the dev servers do; these are the
    // hosts Playwright actually points at.
    ["e2e backend", `http://api.${E2E_ROOT_DOMAIN}:${ports.e2eBackend}`],
    ["e2e frontend", `http://${E2E_ROOT_DOMAIN}:${ports.e2eFrontend}`],
    ["e2e database", names.e2eDatabase],
    ["otel service", names.otelService],
  ];
  const width = Math.max(...rows.map(([k]) => k.length));
  for (const [k, v] of rows) console.log(`${k.padEnd(width)}  ${v}`);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  try {
    main(process.argv.slice(2));
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
