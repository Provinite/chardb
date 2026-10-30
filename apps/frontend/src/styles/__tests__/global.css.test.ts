import "@chardb/ui";
import "../global.css";
import { rulesForSelectors } from "../../__tests__/emittedCss";

const html = document.documentElement;

describe("global styles", () => {
  afterEach(() => {
    delete html.dataset.theme;
  });

  // jsdom drops declarations that use var() from computed style, so this
  // reads the emitted stylesheet.
  it("paints html with the page surface token", () => {
    expect(rulesForSelectors("html")).toContainEqual(
      expect.objectContaining({
        conditions: [],
        declarations: expect.objectContaining({
          "background-color": "var(--surface-page)",
        }),
      }),
    );
  });

  it("gives html the light page surface without data-theme", () => {
    expect(getComputedStyle(html).getPropertyValue("--surface-page")).toBe(
      "#ffffff",
    );
  });

  it("gives html the dark page surface under data-theme=dark", () => {
    html.dataset.theme = "dark";
    expect(getComputedStyle(html).getPropertyValue("--surface-page")).toBe(
      "#0f172a",
    );
  });
});
