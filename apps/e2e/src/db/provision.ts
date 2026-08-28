import { execFileSync } from "node:child_process";
import { CFG, REPO_ROOT } from "../config.js";
import { q, withClient } from "./sql.js";

const run = (cmd: string, args: string[], env: NodeJS.ProcessEnv = {}): void => {
  execFileSync(cmd, args, {
    cwd: REPO_ROOT,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
};

/** Idempotent; `--wait` blocks on the container's pg_isready healthcheck. */
export function startPostgres(): void {
  run("docker", [
    "compose",
    "-f",
    "docker/compose.test.yml",
    "up",
    "-d",
    "--wait",
  ]);
}

export async function dropDatabase(name = CFG.dbName): Promise<void> {
  await withClient(CFG.adminUrl, async (client) => {
    // WITH (FORCE) terminates leftover connections (PG13+); without it a stale
    // backend or psql session makes the drop fail.
    await client.query(`DROP DATABASE IF EXISTS ${q(name)} WITH (FORCE)`);
  });
}

export async function createDatabase(name = CFG.dbName): Promise<void> {
  await dropDatabase(name);
  await withClient(CFG.adminUrl, async (client) => {
    await client.query(`CREATE DATABASE ${q(name)}`);
  });
}

/**
 * Applies the committed migration chain, not `prisma db push`.
 *
 * `db push` derives the schema from schema.prisma, which means it structurally
 * cannot detect migration drift: a migration that fails to reproduce
 * schema.prisma would pass every test here and only break on deploy. Running the
 * real chain makes the E2E database match what production will actually have.
 */
export function migrate(): void {
  run(
    "yarn",
    ["workspace", "@chardb/database", "exec", "prisma", "migrate", "deploy"],
    { DATABASE_URL: CFG.databaseUrl },
  );
}

/** Fails if the migration chain does not reproduce schema.prisma. */
export function assertNoDrift(): void {
  try {
    run(
      "yarn",
      [
        "workspace",
        "@chardb/database",
        "exec",
        "prisma",
        "migrate",
        "diff",
        "--from-url",
        CFG.databaseUrl,
        "--to-schema-datamodel",
        "prisma/schema.prisma",
        "--exit-code",
      ],
      { DATABASE_URL: CFG.databaseUrl },
    );
  } catch {
    throw new Error(
      "Migration drift: the committed migrations do not reproduce schema.prisma. " +
        "Generate a migration for the outstanding schema changes before running E2E.",
    );
  }
}

export async function provision(): Promise<void> {
  startPostgres();
  await createDatabase();
  migrate();
  assertNoDrift();
}
