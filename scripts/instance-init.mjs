#!/usr/bin/env node
/**
 * Prepares a fresh checkout to run its own instance of the stack.
 *
 *   yarn instance:init
 *
 * A new checkout -- a linked worktree or a separate clone alike -- has no .env
 * files: they are gitignored, and the backend hard-crashes at boot without
 * JWT_SECRET and the OAuth client ids. This copies them from another checkout
 * on this machine (same developer, same secrets) and falls back to the
 * .env.example templates otherwise.
 *
 * It never overwrites an existing file. The per-instance ports and URLs are not
 * written into .env at all -- they are injected at run time by
 * scripts/with-instance.mjs, so a checkout's .env stays a pure secrets file and
 * re-resolving its slot needs no edit.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import {
  findPrimaryCheckout,
  findRepoRoot,
  listClaims,
  resolveInstance,
} from "./instance.mjs";

/** [destination, template] pairs, relative to the checkout root. */
const ENV_FILES = [
  ["apps/backend/.env", "apps/backend/.env.example"],
  ["apps/frontend/.env", "apps/frontend/.env.example"],
];

/**
 * Checkouts to copy .env files from, best first.
 *
 * A linked worktree has an obvious donor -- the checkout it came from. A
 * separate clone has none, so fall back to any other checkout the instance
 * registry knows about and that still exists on disk.
 */
function findDonors(root) {
  const primary = findPrimaryCheckout(root);
  const registered = listClaims()
    .map((claim) => claim.path)
    .filter((candidate) => candidate !== root && fs.existsSync(candidate));
  return [...(primary ? [primary] : []), ...registered];
}

function main() {
  const root = findRepoRoot();
  const donors = findDonors(root);

  for (const [dest, template] of ENV_FILES) {
    const target = path.join(root, dest);
    if (fs.existsSync(target)) {
      console.log(`keep    ${dest}  (already present)`);
      continue;
    }

    const donor = donors
      .map((from) => path.join(from, dest))
      .find((candidate) => fs.existsSync(candidate));
    if (donor) {
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
