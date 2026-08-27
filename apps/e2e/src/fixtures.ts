import { test as base, expect, type Page } from "@playwright/test";
import { seedPreset } from "./world/seed.js";
import type { AnyPresetHandle, PresetName } from "./world/presets/index.js";
import type { World } from "./world/types.js";

interface Options {
  preset: PresetName;
  /** A persona key from the preset, or "anon" for a signed-out context. */
  persona: string;
}

interface Fixtures {
  world: World<AnyPresetHandle>;
}

interface WorkerFixtures {
  _worldCache: { key?: string; world?: World<AnyPresetHandle> };
}

export const test = base.extend<Options & Fixtures, WorkerFixtures>({
  preset: ["community-basic", { option: true }],
  persona: ["anon", { option: true }],

  _worldCache: [
    async ({}, use) => {
      await use({});
    },
    { scope: "worker" },
  ],

  /**
   * Restores the preset snapshot once per (preset, spec file).
   *
   * With workers: 1 and fullyParallel: false, caching on the worker keyed by
   * file is exactly per-file reset. Tests WITHIN a file therefore share state --
   * for stricter isolation a spec can opt in explicitly:
   *
   *   test.beforeEach(async ({ world }) => { await world.reset(); });
   *
   * which is the same mechanism at per-test granularity (~66ms).
   */
  world: async ({ preset, _worldCache }, use, testInfo) => {
    const key = `${preset}::${testInfo.file}`;
    if (_worldCache.key !== key) {
      _worldCache.world = await seedPreset(preset);
      _worldCache.key = key;
    }
    await use(_worldCache.world!);
  },

  // Injects the persona's token instead of driving the login form. The world
  // fixture must resolve first so the storageState file exists on disk.
  storageState: async ({ preset, persona, world }, use) => {
    await use(
      persona === "anon" ? { cookies: [], origins: [] } : world.storageState(persona),
    );
  },
});

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
