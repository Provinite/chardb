import { defineConfig, devices } from "@playwright/test";
import { CFG } from "./src/config.js";

export default defineConfig({
  testDir: "./tests",
  testMatch: /.*\.(e2e|setup|teardown)\.ts$/,

  // Deliberately serial for now. Every port and the database name are already
  // offset by TEST_PARALLEL_INDEX (see src/config.ts), so raising this is a
  // config change rather than a rewrite -- but note that per-worker databases
  // partition state, they do not isolate tests from each other within a worker.
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
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: CFG.frontendUrl,
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

  webServer: [
    {
      command: "yarn tsx src/servers/backend.ts",
      url: `${CFG.backendUrl}/health`,
      timeout: 300_000, // includes docker up, migrate, and a cold nest build
      reuseExistingServer: CFG.reuseServers,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: "yarn tsx src/servers/frontend.ts",
      url: CFG.frontendUrl,
      timeout: 300_000, // includes codegen + vite build on a cold run
      reuseExistingServer: CFG.reuseServers,
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
