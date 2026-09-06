/**
 * Agent-accessible entry point.
 *
 *   yarn workspace @chardb/e2e world --list
 *   yarn workspace @chardb/e2e world community-basic
 *   yarn workspace @chardb/e2e world community-basic --json
 *
 * Contract: with --json, ONLY the JSON document goes to stdout and every log
 * line goes to stderr, so the output is safe to pipe into jq. Exits non-zero on
 * failure.
 *
 * Assumes the servers are already up (`yarn workspace @chardb/e2e e2e` brings
 * them up, or run the server scripts directly).
 */
import { CFG, apexUrl } from "../config.js";
import { PRESETS, type PresetName } from "../world/presets/index.js";
import { seedPreset } from "../world/seed.js";

const log = (...a: unknown[]): void => console.error(...a);

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const positional = args.filter((a) => !a.startsWith("--"));

  if (args.includes("--list") || positional.length === 0) {
    log("Available presets:\n");
    for (const [name, def] of Object.entries(PRESETS)) {
      log(`  ${name.padEnd(20)} ${def.description}`);
    }
    log("");
    return;
  }

  const preset = positional[0] as PresetName;
  log(`Seeding "${preset}" ...`);
  const world = await seedPreset(preset);

  // Browser-facing URLs, because a human or an agent drives this in a browser.
  // The site is at its root domain and each community at its own subdomain;
  // the loopback address the servers bind to is not a hostname the app can
  // work out a community from, so it is not offered here.
  const out = {
    preset,
    frontendUrl: CFG.apexUrl,
    backendUrl: CFG.browserBackendUrl,
    graphqlUrl: `${CFG.browserBackendUrl}/graphql`,
    loginUrl: apexUrl("/login"),
    users: Object.fromEntries(
      Object.entries(world.users).map(([k, p]) => [
        k,
        {
          userId: p.userId,
          username: p.username,
          email: p.email,
          password: p.password,
          accessToken: p.accessToken,
          isAdmin: p.isAdmin,
        },
      ]),
    ),
    ...Object.fromEntries(
      Object.entries(world).filter(
        ([k]) =>
          !["users", "preset", "as", "storageState", "reset"].includes(k),
      ),
    ),
  };

  if (json) {
    process.stdout.write(JSON.stringify(out, null, 2) + "\n");
  } else {
    log("");
    process.stdout.write(JSON.stringify(out, null, 2) + "\n");
  }
}

main().catch((err) => {
  log("\nFAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
