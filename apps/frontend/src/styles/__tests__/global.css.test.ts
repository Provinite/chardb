import "@chardb/ui";
import "../global.css";

const html = document.documentElement;

describe("global styles", () => {
  afterEach(() => {
    delete html.dataset.theme;
  });

  // jsdom drops declarations that use var() from computed style, so this
  // reads the emitted stylesheet.
  it("paints html with the page surface token", () => {
    const css = [...document.querySelectorAll("style")]
      .map((style) => style.textContent)
      .join("\n");
    expect(css).toMatch(
      /html\s*{[^}]*background-color:\s*var\(--surface-page\)/,
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
