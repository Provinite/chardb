import type { Locator, Page } from "@playwright/test";

/**
 * The page search ("spotlight"): a combobox over a listbox of results, in a
 * dialog opened from the sidebar or with Mod+K.
 *
 * Results are found by their text -- label, then description -- because a
 * result's accessible name is the same text and the specs read it the way a
 * person scanning the list would.
 */

const PLACEHOLDER = "Search pages, or @ for members...";

export interface Spotlight {
  /** The sidebar button that opens it. */
  trigger: Locator;
  dialog: Locator;
  input: Locator;
  /** Every result on screen. */
  results: Locator;
  /** Results whose text (label, then description) matches. */
  result: (text: string | RegExp) => Locator;
  /** Opens it from the sidebar and types `query`. */
  search: (query: string) => Promise<void>;
}

export function spotlight(page: Page): Spotlight {
  const input = page.getByPlaceholder(PLACEHOLDER);
  const dialog = page.getByRole("dialog").filter({ has: input });
  const results = dialog.getByRole("option");
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
