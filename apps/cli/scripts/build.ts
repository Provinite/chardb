import { chmodSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Where `yarn workspace @chardb/cli build` writes, and what `bin` names. */
export const DEFAULT_OUTFILE = join(packageRoot, "dist", "chardb.mjs");

/**
 * Bundles the CLI and its dependencies into one executable file.
 *
 * Starting from source costs tsx's compile on every call; the bundle starts
 * in about the time node itself takes.
 */
export async function buildCli({
  outfile = DEFAULT_OUTFILE,
}: { outfile?: string } = {}): Promise<void> {
  await build({
    entryPoints: [join(packageRoot, "src", "main.ts")],
    outfile,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
    // Also what makes the output independent of the working directory:
    // unminified, it embeds module paths relative to it.
    minify: true,
    banner: { js: "#!/usr/bin/env node" },
    logLevel: "warning",
  });
  chmodSync(outfile, 0o755);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await buildCli();
}
