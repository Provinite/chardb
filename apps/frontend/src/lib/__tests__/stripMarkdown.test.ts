import { describe, it, expect } from "vitest";
import { stripMarkdown } from "../stripMarkdown";

/**
 * `stripMarkdown` turns user-authored markdown into plain text for places that
 * cannot render it: the media card's preview line, and `og:description`.
 *
 * The escaping cases below are the reason this file exists. The pipeline ends
 * by serialising back to markdown, which re-escapes anything that could start a
 * construct -- so the helper was handing its callers `some\_user\_name` and the
 * backslashes reached the page.
 */
describe("stripMarkdown", () => {
  it("removes headings, emphasis and strong", () => {
    expect(stripMarkdown("# Title\n\nA **bold** and _italic_ line.")).toBe(
      "Title\n\nA bold and italic line.",
    );
  });

  it("keeps link text and drops the target", () => {
    expect(stripMarkdown("Art by [mara](https://example.com/mara).")).toBe(
      "Art by mara.",
    );
  });

  it("leaves an underscored word alone", () => {
    // Intraword underscores are not emphasis, so nothing is stripped -- but the
    // serialiser used to escape them on the way back out.
    expect(stripMarkdown("Posted by some_user_name")).toBe(
      "Posted by some_user_name",
    );
  });

  it("leaves asterisks that were never markup alone", () => {
    expect(stripMarkdown("2 * 3 * 4")).toBe("2 * 3 * 4");
  });

  it("does not strip a backslash that is not an escape", () => {
    // `\d` is not an escapable punctuation character, so the path survives.
    expect(stripMarkdown("path C:\\dir")).toContain("C:\\dir");
  });

  it("returns an empty string for empty input", () => {
    expect(stripMarkdown("")).toBe("");
  });
});
