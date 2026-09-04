#!/usr/bin/env node
/**
 * Prepares a fresh worktree to run its own instance of the stack.
 *
 *   yarn instance:init
 *
 * A new worktree has no .env files -- they are gitignored, and the backend
 * hard-crashes at boot without JWT_SECRET and the OAuth client ids. This copies
 * them from the primary checkout when one exists (same machine, same developer,
 * same secrets) and falls back to the .env.example templates otherwise.
 *
 * It never overwrites an existing file. The per-instance ports and URLs are not
 * written into .env at all -- they are injected at run time by
 * scripts/with-instance.mjs, so a worktree's .env stays a pure secrets file and
 * re-resolving its slot needs no edit.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import {
  findPrimaryCheckout,
  findRepoRoot,
  resolveInstance,
} from "./instance.mjs";

/** [destination, template] pairs, relative to the worktree root. */
const ENV_FILES = [
  ["apps/backend/.env", "apps/backend/.env.example"],
  ["apps/frontend/.env", "apps/frontend/.env.example"],
];

function main() {
  const root = findRepoRoot();
  const primary = findPrimaryCheckout(root);

  for (const [dest, template] of ENV_FILES) {
    const target = path.join(root, dest);
    if (fs.existsSync(target)) {
      console.log(`keep    ${dest}  (already present)`);
      continue;
    }

    const donor = primary ? path.join(primary, dest) : null;
    if (donor && fs.existsSync(donor)) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(donor, target);
      console.log(`copy    ${dest}  <- ${donor}`);
      continue;
    }

    const source = path.join(root, template);
    if (!fs.existsSync(source)) {
      console.log(`skip    ${dest}  (no ${template} to copy from)`);
      continue;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
    console.log(`create  ${dest}  <- ${template}`);
    console.log(
      `        fill in the secrets before starting the backend -- it will not ` +
        `boot with the placeholder values.`,
    );
  }

  const instance = resolveInstance();
  console.log("");
  console.log(`Instance slot ${instance.slot}:`);
  console.log(`  frontend  ${instance.urls.frontendUrl}`);
  console.log(`  backend   ${instance.urls.backendUrl}`);
  console.log(
    `  postgres  localhost:${instance.ports.postgres}/${instance.names.devDatabase}`,
  );
  console.log("");
  console.log(
    "Next: `yarn infra:up` then `yarn dev` (or `yarn instance` for the full table).",
  );
}

main();
