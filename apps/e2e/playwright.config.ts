import { defineConfig, devices } from "@playwright/test";
import { CFG } from "./src/config.js";

export default defineConfig({
  testDir: "./tests",
  testMatch: /.*\.(e2e|setup|teardown)\.ts$/,

  // Deliberately serial, and deliberately unconditional -- a local run is one
  // browser, one backend, one frontend, whatever the machine.
  //
  // Parallelism in CI comes from `--shard`, not from this number: each shard is
  // a separate runner with its own database, ports and containers, so it needs
  // no isolation work here. See the `e2e` job in .github/workflows/ci.yml, and
  // "Parallelism" in README.md for why raising `workers` is the harder axis.
  workers: 1,
  fullyParallel: false,

  forbidOnly: !!process.env.CI,
  // One retry in CI only. The suite resets state between spec files and runs
  // serially, so genuine flake should be rare -- this absorbs the residual
  // (a slow cold start, a dropped connection) without masking a real failure,
  // since a test that fails twice still fails the run. Locally it stays 0 so a
  // flaky test is visible while you are writing it.
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  // `blob` in CI because the run is sharded: each shard emits a blob that
  // `playwright merge-reports` stitches into one HTML report, so a failure is
  // read in a single place rather than by guessing which of N shards owns it.
  // Locally there is one unsharded run, so HTML is written directly and
  // `yarn e2e:report` keeps working.
  reporter: process.env.CI
    ? [["list"], ["blob"]]
    : [["list"], ["html", { open: "never" }]],

  use: {
    // The APEX, by name -- not `CFG.frontendUrl`, which is the loopback address
    // the servers bind to and Node polls. A relative `page.goto("/login")`
    // resolves against this, so it lands on the apex; a community page is on
    // another origin and is always reached by an absolute URL (see
    // `communityUrl` in src/config.ts). Chromium resolves every `*.localhost`
    // label to loopback on its own, so no host mapping is needed here.
    baseURL: CFG.apexUrl,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },

  // Setup/teardown are *projects*, not globalSetup/globalTeardown. Playwright
  // implements webServer as a runner plugin whose ordering relative to
  // globalSetup has shifted across versions; projects unambiguously run after
  // the webServers report ready, which is what seeding requires.
  projects: [
    { name: "setup", testMatch: /world\.setup\.ts$/, teardown: "teardown" },
    { name: "teardown", testMatch: /world\.teardown\.ts$/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
      testMatch: /.*\.e2e\.ts$/,
    },
  ],

  // `gracefulShutdown` is load-bearing, not a nicety. Without it Playwright
  // reclaims each webServer with SIGKILL to the process group -- uncatchable, so
  // nest never closes its connection pool and vite never flushes. With it the
  // group gets SIGTERM first and Playwright still escalates to SIGKILL if the
  // timeout passes, so nothing can hang the run. The wrapper scripts wait for
  // their child to actually exit before exiting themselves (src/servers/
  // supervise.ts); together that is what stops a run leaving a server on the
  // port for the next one to trip over.
  webServer: [
    {
      command: "yarn tsx src/servers/backend.ts",
      url: `${CFG.backendUrl}/health`,
      timeout: 300_000, // includes docker up, migrate, and a cold nest build
      gracefulShutdown: { signal: "SIGTERM", timeout: 10_000 },
      reuseExistingServer: CFG.reuseServers,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: "yarn tsx src/servers/frontend.ts",
      url: CFG.frontendUrl,
      timeout: 300_000, // includes codegen + vite build on a cold run
      gracefulShutdown: { signal: "SIGTERM", timeout: 10_000 },
      reuseExistingServer: CFG.reuseServers,
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
