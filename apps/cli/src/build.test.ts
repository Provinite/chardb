import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildCli } from "./build";

describe("buildCli", () => {
  let dir: string;
  let outfile: string;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), "chardb-cli-build-"));
    outfile = join(dir, "chardb.mjs");
    await buildCli({ outfile });
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("writes one executable file that starts with a node shebang", () => {
    expect(readFileSync(outfile, "utf8").split("\n")[0]).toBe(
      "#!/usr/bin/env node",
    );
    expect(statSync(outfile).mode & 0o111).not.toBe(0);
  });

  it("runs on its own, with no node_modules beside it", () => {
    const { CHARDB_TOKEN: _token, ...env } = process.env;
    const result = spawnSync(outfile, ["whoami"], {
      cwd: dir,
      env: { ...env, XDG_CONFIG_HOME: join(dir, "config") },
      encoding: "utf8",
    });

    expect(result.stderr).toContain("No access token");
    expect(result.status).toBe(2);
  });
});
