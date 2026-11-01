import { readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { MODULE_METADATA } from "@nestjs/common/constants";
import { Clock } from "./clock";
import { ClockModule } from "./clock.module";

/**
 * There is one clock. A module that lists `Clock` among its own providers
 * gets a separate instance, which can then disagree with everyone else's
 * about what time it is; it imports `ClockModule` instead.
 *
 * Every `*.module.ts` is found rather than listed, so a new module is covered
 * without anyone remembering to add it.
 */
const SRC_ROOT = join(__dirname, "..");

/** Fewer than this means the scan found nothing and passed vacuously. */
const MINIMUM_EXPECTED_MODULES = 20;

const moduleFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return moduleFiles(full);
    return entry.name.endsWith(".module.ts") ? [full] : [];
  });

const isClass = (value: unknown): value is object =>
  typeof value === "function";

const providesClock = (provider: unknown): boolean =>
  provider === Clock ||
  (typeof provider === "object" &&
    provider !== null &&
    (provider as { provide?: unknown }).provide === Clock);

describe("Clock", () => {
  const modules = moduleFiles(SRC_ROOT).flatMap((file) => {
    // Dynamic by necessity, as in resolver-permission-coverage.spec.ts.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const exported = require(file) as Record<string, unknown>;
    return Object.entries(exported).flatMap(([name, value]) =>
      isClass(value)
        ? [
            {
              name: `${relative(SRC_ROOT, file)} — ${name}`,
              target: value,
              providers:
                (Reflect.getMetadata(MODULE_METADATA.PROVIDERS, value) as
                  | unknown[]
                  | undefined) ?? [],
            },
          ]
        : [],
    );
  });

  it("finds the app's modules", () => {
    expect(modules.length).toBeGreaterThanOrEqual(MINIMUM_EXPECTED_MODULES);
  });

  it("is provided by ClockModule alone", () => {
    const offenders = modules
      .filter((m) => m.target !== ClockModule)
      .filter((m) => m.providers.some(providesClock))
      .map((m) => m.name);
    expect(offenders).toEqual([]);
  });
});
