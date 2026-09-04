#!/usr/bin/env node
/**
 * Runs a command with this worktree's instance environment applied.
 *
 *   node scripts/with-instance.mjs nest start --watch
 *
 * Two rules govern what gets injected, and both exist to make this safe to put
 * in front of every dev script:
 *
 *  1. **Slot 0 is left alone.** The primary checkout keeps its ports, its
 *     .env files and its compose project exactly as they were; only
 *     CHARDB_INSTANCE and the (already implicit) COMPOSE_PROJECT_NAME are set.
 *     Anything more would let a generated DATABASE_URL override the real one
 *     in apps/backend/.env.
 *  2. **An already-set variable always wins.** `PORT=9999 yarn dev` still
 *     listens on 9999. The instance supplies defaults, not overrides.
 *
 * Injection is into the child's environment only -- nothing is written to disk,
 * so the .env files stay pure secrets files and re-resolving a slot needs no
 * edit. `yarn instance:env` prints the same values if you want them in a shell.
 */
import { spawn } from "node:child_process";
import { resolveInstance } from "./instance.mjs";

/** Vars slot 0 accepts. Everything else there comes from the committed .env files. */
const LEGACY_SAFE = new Set(["CHARDB_INSTANCE", "COMPOSE_PROJECT_NAME"]);

function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    console.error("usage: with-instance.mjs <command> [args...]");
    process.exit(2);
  }

  const instance = resolveInstance();

  const env = { ...process.env };
  for (const [key, value] of Object.entries(instance.env)) {
    if (instance.slot === 0 && !LEGACY_SAFE.has(key)) continue;
    if (env[key] !== undefined) continue;
    env[key] = value;
  }

  const child = spawn(argv[0], argv.slice(1), {
    cwd: process.cwd(),
    stdio: "inherit",
    env,
    shell: process.platform === "win32",
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => child.kill(signal));
  }
  child.on("error", (err) => {
    console.error(`with-instance: could not run ${argv[0]}: ${err.message}`);
    process.exit(127);
  });
  // Preserve signal-death as a signal, so Ctrl-C in a `yarn dev` behaves.
  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exit(code ?? 0);
  });
}

main();
