import type { Locator, Page } from "@playwright/test";

/**
 * The page search ("spotlight"), driven the same way whichever implementation
 * is mounted.
 *
 * Mantine's Spotlight is being replaced by `CommandPalette` (#466). Until
 * Mantine is removed both ship, chosen at runtime, and the specs run against
 * each so the replacement is held to the behaviour it replaces. Selectors here
 * therefore name what a person sees -- the placeholder, the text of a result --
 * rather than either implementation's roles: Mantine's results are buttons,
 * the palette's are options.
 */

export type SpotlightImpl = "mantine" | "palette";

export const SPOTLIGHT_IMPLS: readonly SpotlightImpl[] = ["mantine", "palette"];

/** Read by `apps/frontend/src/components/spotlight/spotlightImpl.ts`. */
const IMPL_STORAGE_KEY = "chardb.spotlightImpl";

const PLACEHOLDER = "Search pages, or @ for members...";

/**
 * Picks the implementation for every page this test opens. Local storage is
 * per origin, and an init script runs on each one, so it holds on community
 * hosts and the apex alike.
 */
export async function chooseSpotlightImpl(
  page: Page,
  impl: SpotlightImpl,
): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key, value);
    },
    [IMPL_STORAGE_KEY, impl] as const,
  );
}

export interface Spotlight {
  /** The sidebar button that opens it. */
  trigger: Locator;
  dialog: Locator;
  input: Locator;
  /** Every result row on screen. */
  results: Locator;
  /** Result rows whose text (label, then description) matches. */
  result: (text: string | RegExp) => Locator;
  /** Opens it from the sidebar and types `query`. */
  search: (query: string) => Promise<void>;
}

export function spotlight(page: Page): Spotlight {
  const input = page.getByPlaceholder(PLACEHOLDER);
  const dialog = page.getByRole("dialog").filter({ has: input });
  const results = dialog.locator('[role="option"], button');
  const trigger = page.getByRole("button", { name: "Search pages" });

  return {
    trigger,
    dialog,
    input,
    results,
    result: (text) => results.filter({ hasText: text }),
    search: async (query) => {
      await trigger.click();
      await input.fill(query);
    },
  };
}
