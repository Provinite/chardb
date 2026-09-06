import { describe, it, expect, beforeEach } from "vitest";
import { applyPageMeta } from "../pageMeta";

const content = (selector: string): string | null =>
  document.head.querySelector(selector)?.getAttribute("content") ?? null;

const tagCount = (selector: string): number =>
  document.head.querySelectorAll(selector).length;

describe("applyPageMeta", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.title = "";
  });

  it("suffixes the document title with the site name", () => {
    applyPageMeta({ title: "Ash" });
    expect(document.title).toBe("Ash | CharDB");
    // og:title is the page alone -- unfurlers render the site name separately.
    expect(content('meta[property="og:title"]')).toBe("Ash");
  });

  it("falls back to the site description when the page has none", () => {
    applyPageMeta({ title: "Ash" });
    expect(content('meta[name="description"]')).toMatch(
      /home for original characters/,
    );
  });

  /**
   * Character details, gallery and media descriptions and user bios are all
   * markdown, and a card has no markdown renderer -- Discord, Slack and
   * Google's snippet print whatever they are given. A character whose details
   * open with a heading was unfurling as "# About Ash This is a test..." with
   * the syntax intact.
   */
  describe("markdown in descriptions", () => {
    it("strips headings and emphasis", () => {
      applyPageMeta({
        title: "Ash",
        description: "# About Ash\n\nThis is a **test** character for _Ash_.",
      });

      const description = content('meta[property="og:description"]') ?? "";
      expect(description).toBe("About Ash This is a test character for Ash.");
      expect(description).not.toContain("#");
      expect(description).not.toContain("**");
      expect(description).not.toContain("_");
    });

    it("keeps link text and drops the URL", () => {
      applyPageMeta({
        title: "Ash",
        description: "Art by [mara](https://example.com/mara).",
      });

      expect(content('meta[property="og:description"]')).toBe("Art by mara.");
    });

    it("flattens a list into one line", () => {
      applyPageMeta({
        title: "Ash",
        description: "Traits:\n\n- horned\n- winged",
      });

      const description = content('meta[property="og:description"]') ?? "";
      expect(description).not.toContain("-");
      expect(description).toContain("horned");
      expect(description).toContain("winged");
    });

    it("leaves plain text alone", () => {
      // The generated fallbacks are not markdown, and must survive unchanged --
      // an underscore in a username especially.
      applyPageMeta({ title: "Ash", description: "Posted by some_user_name" });
      expect(content('meta[property="og:description"]')).toBe(
        "Posted by some_user_name",
      );
    });

    it("truncates after stripping, not before", () => {
      // Otherwise the cut lands inside the syntax and the 200 characters are
      // spent on asterisks rather than on words. Trimmed, because `** ... **`
      // with a space before the closing pair is not emphasis in CommonMark --
      // it is literal text, and would legitimately keep its asterisks.
      applyPageMeta({
        title: "Ash",
        description: `**${"word ".repeat(80).trim()}**`,
      });

      const description = content('meta[property="og:description"]') ?? "";
      expect(description).not.toContain("*");
      expect(description.length).toBeLessThanOrEqual(201);
      expect(description.startsWith("word word")).toBe(true);
    });
  });

  it("collapses whitespace", () => {
    applyPageMeta({ title: "Ash", description: "  a\n\n  b   c  " });
    expect(content('meta[property="og:description"]')).toBe("a b c");
  });

  it("truncates a long description at a word boundary", () => {
    const words = `${"lorem ipsum ".repeat(40)}tail`;
    applyPageMeta({ title: "Ash", description: words });

    const description = content('meta[property="og:description"]') ?? "";
    // 200 characters plus the ellipsis, and never more.
    expect(description.length).toBeLessThanOrEqual(201);
    expect(description.endsWith("…")).toBe(true);
    // Cut between words, so no half word before the ellipsis.
    expect(description).toMatch(/(lorem|ipsum)…$/);
  });

  it("hard-cuts rather than discarding most of a long unbroken token", () => {
    // A URL in a bio is the realistic case. Backing up to the last space would
    // leave "a b…" and throw away 200 characters that would have fit.
    applyPageMeta({ title: "Ash", description: `a b ${"x".repeat(400)}` });

    const description = content('meta[property="og:description"]') ?? "";
    expect(description.length).toBe(201);
    expect(description.startsWith("a b xxx")).toBe(true);
  });

  it("reuses the tags already in index.html rather than duplicating them", () => {
    // OpenGraph keys on `property` and the HTML spec on `name`; matching the
    // wrong attribute appends a second tag beside the static one.
    document.head.innerHTML = `
      <meta name="description" content="static" />
      <meta property="og:title" content="static" />
    `;

    applyPageMeta({ title: "Ash", description: "A character" });

    expect(tagCount('meta[name="description"]')).toBe(1);
    expect(tagCount('meta[property="og:title"]')).toBe(1);
    expect(content('meta[property="og:title"]')).toBe("Ash");
  });

  it("drops a previous page's image instead of leaving it on this one", () => {
    applyPageMeta({ title: "Ash", image: "https://cdn.example/ash.png" });
    expect(content('meta[property="og:image"]')).toBe(
      "https://cdn.example/ash.png",
    );
    expect(content('meta[name="twitter:card"]')).toBe("summary_large_image");

    // Otherwise one character's art ends up captioned with another's name.
    applyPageMeta({ title: "Mara" });
    expect(tagCount('meta[property="og:image"]')).toBe(0);
    expect(content('meta[name="twitter:card"]')).toBe("summary");
  });

  it("defaults og:type to website and takes profile when given", () => {
    applyPageMeta({ title: "Ash" });
    expect(content('meta[property="og:type"]')).toBe("website");

    applyPageMeta({ title: "@mara", type: "profile" });
    expect(content('meta[property="og:type"]')).toBe("profile");
  });
});
