#!/usr/bin/env node
/**
 * A read-only psql against a deployed database.
 *
 *   yarn db:query prod
 *   yarn db:query prod -c "select count(*) from images"
 *   yarn db:query prod -f report.sql --csv
 *
 * Arguments after the environment go to psql untouched.
 *
 * The connection URL is fetched from Parameter Store at run time and handed to
 * psql through libpq's PG* variables -- never as an argument, because
 * /proc/<pid>/cmdline is world-readable and /proc/<pid>/environ is not. It is
 * never printed, never written to disk, and no shell ever parses it.
 *
 * Sessions are read-only and require TLS. Read-only is a guard rail rather
 * than a boundary: the credential can write, and an interactive session can
 * turn the setting off. Real enforcement would be a separate database role.
 */

import { execFileSync, spawnSync } from "node:child_process";

const PROJECT = "chardb";

/** Environments holding a connection URL. Others manage credentials elsewhere. */
const ENVIRONMENTS = ["prod"];

function usage(exitCode) {
  const stream = exitCode === 0 ? process.stdout : process.stderr;
  stream.write(
    [
      "Usage: yarn db:query <environment> [psql arguments...]",
      "",
      `  environment   one of: ${ENVIRONMENTS.join(", ")}`,
      "",
      "Sessions are read-only. Arguments after the environment go to psql.",
      "",
    ].join("\n"),
  );
  process.exit(exitCode);
}

function requireOnPath(command, hint) {
  const probe = spawnSync(command, ["--version"], { stdio: "ignore" });
  if (probe.error?.code === "ENOENT") {
    console.error(`Required command not found: ${command}`);
    console.error(`  ${hint}`);
    process.exit(1);
  }
}

/** Reads the value; never logs it. No shell, so nothing reaches history. */
function readParameter(name) {
  try {
    return execFileSync(
      "aws",
      [
        "ssm",
        "get-parameter",
        "--name",
        name,
        "--with-decryption",
        "--query",
        "Parameter.Value",
        "--output",
        "text",
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    ).trim();
  } catch (error) {
    // The CLI's own message. It cannot contain a value it failed to fetch.
    const detail = (error.stderr || error.message || "").toString().trim();
    console.error("Could not read the connection parameter.");
    if (detail) console.error(detail);
    console.error("");
    console.error("Check your AWS credentials and that they carry");
    console.error("ssm:GetParameter plus kms:Decrypt.");
    process.exit(1);
  }
}

function callerIdentity() {
  try {
    const json = execFileSync(
      "aws",
      ["sts", "get-caller-identity", "--output", "json"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    const { Account, Arn } = JSON.parse(json);
    return { account: Account, arn: Arn };
  } catch {
    console.error("AWS credentials are not usable. Sign in, or set");
    console.error("AWS_PROFILE, and try again.");
    process.exit(1);
  }
}

/**
 * Trimmed for the banner. This repository is public and its CI logs are
 * world-readable, so account ids and endpoints printed here can end up
 * somewhere they cannot be taken back from. Examples use AWS's documentation
 * placeholders on purpose.
 */
const mask = {
  /** 123456789012 -> ...9012 */
  account: (account) => `...${String(account).slice(-4)}`,

  /** arn:aws:iam::123456789012:user/someone -> user/someone */
  identity: (arn) => String(arn).split(":").slice(5).join(":") || String(arn),
};

/**
 * Split the URL into libpq variables.
 *
 * The password needs decoding: it is stored percent-encoded, and the URL
 * parser leaves `url.password` that way. Passing it through unmodified
 * authenticates with the literal escape and fails as though the credential
 * were wrong.
 */
function connectionEnv(databaseUrl) {
  let url;
  try {
    url = new URL(databaseUrl);
  } catch {
    console.error("The stored connection URL is not a valid URL.");
    process.exit(1);
  }

  let password;
  try {
    password = decodeURIComponent(url.password);
  } catch {
    console.error("The stored connection URL has a malformed escape.");
    process.exit(1);
  }

  return {
    PGHOST: url.hostname,
    PGPORT: url.port || "5432",
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: password,
    PGDATABASE: url.pathname.replace(/^\//, ""),
    PGSSLMODE: "require",
    // Fail in seconds rather than hanging: a blocked address is dropped
    // silently rather than refused.
    PGCONNECT_TIMEOUT: "10",
    PGOPTIONS: "-c default_transaction_read_only=on",
    PGAPPNAME: "chardb-db-query",
  };
}

function main() {
  const argv = process.argv.slice(2);

  if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h") {
    usage(argv.length === 0 ? 1 : 0);
  }

  const environment = argv[0];
  const psqlArgs = argv.slice(1);

  if (!ENVIRONMENTS.includes(environment)) {
    console.error(`Unknown environment: ${environment}`);
    console.error(`Expected one of: ${ENVIRONMENTS.join(", ")}`);
    process.exit(1);
  }

  requireOnPath("aws", "Install the AWS CLI v2 and sign in.");
  requireOnPath("psql", "Install the postgresql-client package.");

  const identity = callerIdentity();
  const env = connectionEnv(
    readParameter(`/${PROJECT}/${environment}/database-url`),
  );

  console.error(
    [
      "",
      `  environment  ${environment}`,
      `  aws account  ${mask.account(identity.account)}`,
      `  aws identity ${mask.identity(identity.arn)}`,
      "  session      read-only, TLS required",
      "",
    ].join("\n"),
  );

  const result = spawnSync("psql", psqlArgs, {
    // The credential reaches psql only through here. Nothing in argv.
    env: { ...process.env, ...env },
    stdio: "inherit",
  });

  if (result.error) {
    console.error(`Failed to run psql: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error("");
    console.error("psql exited non-zero. A connection timeout usually means");
    console.error("this machine's address is not allowed through.");
  }

  process.exit(result.status ?? 1);
}

main();
