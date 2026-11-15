import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildCli, DEFAULT_OUTFILE } from "./build";

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

  it("matches the committed bundle", () => {
    // Every checkout runs the committed file, so it must be what the source
    // builds to.
    expect(
      readFileSync(outfile, "utf8") === readFileSync(DEFAULT_OUTFILE, "utf8"),
      "apps/cli/dist/chardb.mjs is out of date: run `yarn workspace @chardb/cli build` and commit it",
    ).toBe(true);
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

  it("reads file arguments from where it runs, not a parent's INIT_CWD", () => {
    // Anything started under Yarn inherits INIT_CWD. Run directly, the
    // bundle must ignore it.
    const work = join(dir, "work");
    mkdirSync(work);
    writeFileSync(join(work, "q.graphql"), "query Q { me { id } }");
    const { CHARDB_TOKEN: _token, ...env } = process.env;

    const result = spawnSync(outfile, ["gql", "q.graphql"], {
      cwd: work,
      env: {
        ...env,
        INIT_CWD: dir,
        XDG_CONFIG_HOME: join(dir, "config"),
      },
      encoding: "utf8",
    });

    expect(result.stderr).not.toContain("Could not read");
    expect(result.stderr).toContain("No access token");
  });
});
