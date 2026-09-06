import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Every page sets its own title, and nothing else sets one for it.
 *
 * There is no route-level fallback by design -- see `usePageMeta` -- so a page
 * that forgets the call does not get a generic title, it gets whichever page
 * the visitor came from. Landing on `/dashboard` from a character would leave
 * that character's name in the tab, and bookmarking there would name the
 * bookmark after it.
 *
 * That failure is invisible in review and invisible at runtime unless you
 * happen to be watching the tab, so it is asserted here instead. A new page
 * fails this test until it says what it is called.
 */
const PAGES_DIR = join(__dirname, "..");

const pageFiles = readdirSync(PAGES_DIR).filter((name) =>
  name.endsWith(".tsx"),
);

describe("page titles", () => {
  it("finds the page components to check", () => {
    // Guards against the glob silently matching nothing and the suite below
    // passing vacuously.
    expect(pageFiles.length).toBeGreaterThan(50);
  });

  it.each(pageFiles)("%s calls usePageMeta", (file) => {
    const source = readFileSync(join(PAGES_DIR, file), "utf8");
    expect(source).toContain("usePageMeta(");
  });
});
