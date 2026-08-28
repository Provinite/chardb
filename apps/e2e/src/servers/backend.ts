/**
 * Backend server for the E2E suite. Launched by Playwright's `webServer`, which
 * polls /health and owns the process tree (including kill on crash / Ctrl-C).
 *
 * Runs the compiled bundle rather than `nest start`, so there is no tsc watcher
 * and boot is as fast as it gets.
 *
 * Note the entrypoint is dist/src/main.js, not dist/main.js: apps/backend's
 * tsconfig has `include: ["**\/*.ts"]`, which pulls in test/ and so makes the
 * package root the rootDir. docker/Dockerfile.backend uses the same
 * dist/src/main.js path; the `start:prod` script in package.json points at
 * dist/main and is simply wrong (nothing invokes it).
 */
import { execFileSync, spawn } from "node:child_process";
import * as fs from "node:fs";
import * as net from "node:net";
import * as path from "node:path";
import { CFG, REPO_ROOT } from "../config.js";
import { provision } from "../db/provision.js";

async function assertPortFree(port: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const srv = net.createServer();
    srv.once("error", (e: NodeJS.ErrnoException) =>
      reject(
        e.code === "EADDRINUSE"
          ? new Error(
              `E2E backend port ${port} is already in use. Stop whatever is on it, ` +
                `or set E2E_BACKEND_PORT to a free port.`,
            )
          : e,
      ),
    );
    srv.once("listening", () => srv.close(() => resolve()));
    srv.listen(port, CFG.host);
  });
}

/**
 * Parses apps/backend/.env.test into a plain object.
 *
 * The child env is built explicitly rather than by layering dotenv files at
 * runtime. .env.test already carries every var whose absence hard-crashes boot
 * (JWT_SECRET, and non-empty TOYHOUSE_/DISCORD_/DEVIANTART_CLIENT_ID plus the
 * Discord bot token and secret), and assembling the env by hand removes any
 * question about which file's DATABASE_URL wins.
 */
function readEnvTest(): Record<string, string> {
  const file = path.resolve(REPO_ROOT, "apps/backend/.env.test");
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

async function main(): Promise<void> {
  await assertPortFree(CFG.backendPort);
  await provision();

  execFileSync("yarn", ["workspace", "@chardb/backend", "build"], {
    cwd: REPO_ROOT,
    stdio: "inherit",
  });

  const child = spawn("node", ["dist/src/main.js"], {
    // cwd is apps/backend so the code-first GraphQL schema lands back at
    // src/schema.gql, exactly as `nest start` does in development.
    cwd: path.resolve(REPO_ROOT, "apps/backend"),
    stdio: "inherit",
    env: {
      ...process.env,
      ...readEnvTest(),
      DATABASE_URL: CFG.databaseUrl,
      PORT: String(CFG.backendPort),
      NODE_ENV: "test",
    },
  });

  for (const sig of ["SIGINT", "SIGTERM"] as const) {
    process.on(sig, () => {
      child.kill(sig);
      process.exit(0);
    });
  }
  child.on("exit", (code) => process.exit(code ?? 0));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
