import { readFileSync } from "fs";
import { dirname, join } from "path";

/** The installed directory of `pkg`, given any file resolved inside it. */
const packageRoot = (pkg: string, file: string): string => {
  const marker = `/node_modules/${pkg}/`;
  return file.slice(0, file.lastIndexOf(marker) + marker.length);
};

/** Where `pkg` is installed as seen from inside `from`. */
const resolvedFrom = (from: string, pkg: string): string =>
  packageRoot(
    pkg,
    require.resolve(pkg, { paths: [dirname(require.resolve(from))] }),
  );

/** Every version of `pkg` the lockfile installs. */
const lockedVersions = (pkg: string): string[] => {
  const lockfile = readFileSync(join(__dirname, "../../../yarn.lock"), "utf8");
  const entries = lockfile.split("\n\n").filter((entry) => {
    return entry.trimStart().startsWith(`"${pkg}@`);
  });
  return entries.map((entry) => /^\s+version: (\S+)$/m.exec(entry)?.[1] ?? "");
};

/**
 * A second copy of these OpenTelemetry packages fails without an error. The
 * API hands any copy newer than the registered one a no-op tracer, and a
 * mismatched instrumentation base never registers. Spans, or the trace ids on
 * log lines, just stop appearing.
 */
describe("tracing dependencies", () => {
  it("installs one version of @opentelemetry/api", () => {
    expect(lockedVersions("@opentelemetry/api")).toHaveLength(1);
  });

  /**
   * Prisma depends on `>=0.52 <1`, which resolves to the newest release, so a
   * root `resolutions` entry holds it to ours. Move that entry with the
   * backend's own version.
   */
  it("gives Prisma's instrumentation the backend's instrumentation base", () => {
    const pkg = "@opentelemetry/instrumentation";
    expect(resolvedFrom("@prisma/instrumentation", pkg)).toBe(
      packageRoot(pkg, require.resolve(pkg)),
    );
  });
});
