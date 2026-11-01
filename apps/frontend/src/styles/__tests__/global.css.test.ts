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

  // The baseline Mantine's stylesheet carried, kept when it went (#466).
  it("gives form controls the font around them, size and line height too", () => {
    expect(
      rulesForSelectors("input", "button", "textarea", "select"),
    ).toContainEqual(
      expect.objectContaining({
        declarations: expect.objectContaining({ font: "inherit" }),
      }),
    );
  });

  it("sets the body's line height and smoothing", () => {
    expect(rulesForSelectors("body")).toContainEqual(
      expect.objectContaining({
        declarations: expect.objectContaining({
          "line-height": "var(--font-lineHeight-normal)",
          "-webkit-font-smoothing": "antialiased",
          "-moz-osx-font-smoothing": "grayscale",
        }),
      }),
    );
  });

  it("sizes pseudo-elements by their border box, as everything else", () => {
    expect(rulesForSelectors("*::before", "*::after")).toContainEqual(
      expect.objectContaining({
        declarations: expect.objectContaining({ "box-sizing": "border-box" }),
      }),
    );
  });

  it("keeps phones from resizing text on rotation", () => {
    expect(rulesForSelectors("html")).toContainEqual(
      expect.objectContaining({
        declarations: expect.objectContaining({
          "-webkit-text-size-adjust": "100%",
          "text-size-adjust": "100%",
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
