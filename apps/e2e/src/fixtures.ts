import { test as base, expect, type Page } from "@playwright/test";
import { seedPreset } from "./world/seed.js";
import type {
  AnyPresetHandle,
  PresetHandle,
  PresetName,
} from "./world/presets/index.js";
import type { World } from "./world/types.js";

interface Options {
  preset: PresetName;
  /** A persona key from the preset, or "anon" for a signed-out context. */
  persona: string;
}

interface Fixtures<H> {
  world: World<H>;
}

interface WorkerFixtures<H> {
  _worldCache: { key?: string; world?: World<H> };
}

/**
 * Builds the fixture set for one handle type.
 *
 * The implementations never vary -- only `H` does. It is a factory rather than
 * a single `test` because `test.use({ preset })` is a runtime option that the
 * type system cannot observe: with more than one preset registered, a shared
 * `world` fixture is typed as the union of every handle and every property
 * access on it fails to compile. See {@link presetTest}.
 */
function makeTest<H>() {
  return base.extend<Options & Fixtures<H>, WorkerFixtures<H>>({
    preset: ["community-basic", { option: true }],
    persona: ["anon", { option: true }],

    _worldCache: [
      // Depends on nothing; it is just a mutable box with worker lifetime.
      // Playwright parses this parameter to work out a fixture's dependencies
      // and rejects anything that is not a destructuring pattern, so the empty
      // one is mandatory rather than an oversight. Naming a fixture here just
      // to satisfy the rule would give a worker-scoped fixture a test-scoped
      // dependency, which Playwright also rejects.
      // eslint-disable-next-line no-empty-pattern
      async ({}, use) => {
        await use({});
      },
      { scope: "worker" },
    ],

    /**
     * Restores the preset snapshot once per (preset, spec file).
     *
     * With workers: 1 and fullyParallel: false, caching on the worker keyed by
     * file is exactly per-file reset. Tests WITHIN a file therefore share state
     * -- for stricter isolation a spec can opt in explicitly:
     *
     *   test.beforeEach(async ({ world }) => { await world.reset(); });
     *
     * which is the same mechanism at per-test granularity (~66ms).
     */
    world: async ({ preset, _worldCache }, use, testInfo) => {
      const key = `${preset}::${testInfo.file}`;
      if (_worldCache.key !== key) {
        // The only cast in the chain, and the only place one is possible:
        // `preset` is a runtime string, so the handle it produces cannot be
        // tied to H statically. presetTest is what makes the two agree.
        _worldCache.world = (await seedPreset(preset)) as unknown as World<H>;
        _worldCache.key = key;
      }
      await use(_worldCache.world!);
    },

    // Injects the persona's token instead of driving the login form. The world
    // fixture must resolve first so the storageState file exists on disk.
    storageState: async ({ persona, world }, use) => {
      await use(
        persona === "anon"
          ? { cookies: [], origins: [] }
          : world.storageState(persona),
      );
    },
  });
}

/**
 * The untyped-handle `test`. Prefer {@link presetTest}, which gives `world` a
 * concrete type; this export exists for specs that touch no preset data at all.
 */
export const test = makeTest<AnyPresetHandle>();

/**
 * A `test` bound to one preset, with `world` narrowed to that preset's handle.
 *
 * Naming the preset once, at module scope, is what turns the union back into a
 * concrete type. It replaces `test.use({ preset })` rather than sitting beside
 * it, so the declared preset and the handle type can never disagree.
 *
 * ```ts
 * const test = presetTest("community-items");
 *
 * test.describe("the ledger", () => {
 *   test.use({ persona: "member" });
 *   test("lists the seeded grant", async ({ page, world }) => {
 *     await page.goto(world.community.ledgerUrl); // typed
 *   });
 * });
 * ```
 */
export function presetTest<K extends PresetName>(preset: K) {
  const scoped = makeTest<PresetHandle<K>>();
  scoped.use({ preset });
  return scoped;
}

export { expect };

/**
 * Accepts the next window.confirm.
 *
 * MUST be registered before the click that triggers it: Playwright
 * auto-DISMISSES unhandled dialogs, so a missing handler makes the app's
 * `if (!window.confirm(...)) return;` early-return and the test fails as a
 * silent no-op that reads like "the button is broken".
 */
export function acceptNextDialog(
  page: Page,
  assert?: (message: string) => void,
): void {
  page.once("dialog", async (dialog) => {
    assert?.(dialog.message());
    await dialog.accept();
  });
}
