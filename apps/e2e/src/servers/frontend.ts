/**
 * Frontend server for the E2E suite.
 *
 * Defaults to serving a production build via `vite preview` rather than
 * `vite dev`:
 *
 *  - Fidelity: preview serves the exact bundle users receive. Dev mode serves
 *    unbundled ESM with different resolution and no minification, so bugs that
 *    only appear in the built output -- precisely what an E2E suite exists to
 *    catch -- are invisible there.
 *  - Speed: with Apollo, Mantine, framer-motion and react-markdown in the graph,
 *    a cold dev-mode first navigation costs seconds of on-demand transform, paid
 *    on every test. Preview serves static files.
 *
 * Set E2E_FRONTEND_MODE=dev to opt out, E2E_SKIP_BUILD=1 to reuse dist/.
 */
import { execFileSync, spawn } from "node:child_process";
import * as net from "node:net";
import { CFG, REPO_ROOT } from "../config.js";
import { superviseChild } from "./supervise.js";

async function assertPortFree(port: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const srv = net.createServer();
    srv.once("error", (e: NodeJS.ErrnoException) =>
      reject(
        e.code === "EADDRINUSE"
          ? new Error(
              `E2E frontend port ${port} is already in use. Stop whatever is on it, ` +
                `or set E2E_FRONTEND_PORT to a free port.`,
            )
          : e,
      ),
    );
    srv.once("listening", () => srv.close(() => resolve()));
    srv.listen(port, CFG.host);
  });
}

async function main(): Promise<void> {
  await assertPortFree(CFG.frontendPort);

  // VITE_API_URL is an ORIGIN; apps/frontend/src/lib/apollo.ts appends /graphql.
  // (VITE_GRAPHQL_URL in .env and the compose files is dead config -- nothing
  // reads it.) Vite inlines env at BUILD time, so this must be set for the build,
  // not merely for the server.
  const env = { ...process.env, VITE_API_URL: CFG.backendUrl };

  if (CFG.frontendMode === "preview" && !CFG.skipBuild) {
    // codegen reads the committed schema.gql from disk -- no running backend needed.
    execFileSync("yarn", ["workspace", "@chardb/frontend", "codegen"], {
      cwd: REPO_ROOT,
      stdio: "inherit",
      env,
    });
    // `vite build` directly, NOT `yarn build`/`build:safe`: that chains tsc, and
    // a type error unrelated to E2E should not be able to take the suite down.
    execFileSync(
      "yarn",
      ["workspace", "@chardb/frontend", "exec", "vite", "build"],
      {
        cwd: REPO_ROOT,
        stdio: "inherit",
        env,
      },
    );
  }

  // --strictPort in BOTH modes. Without it Vite silently moves to the next free
  // port, Playwright's webServer.url poll then hangs for the full timeout, and
  // you get "timed out waiting for URL" while a healthy server sits elsewhere.
  // (vite preview also defaults to 4173, not 3000, so the port must be explicit.)
  const args = [
    "workspace",
    "@chardb/frontend",
    "exec",
    "vite",
    CFG.frontendMode === "preview" ? "preview" : "dev",
    "--port",
    String(CFG.frontendPort),
    "--strictPort",
    "--host",
    CFG.host,
  ];

  const child = spawn("yarn", args, { cwd: REPO_ROOT, stdio: "inherit", env });

  superviseChild(child);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
