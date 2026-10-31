import { describe, it, expect } from "vitest";
import { isPaletteShortcut, nothingFoundText } from "../spotlightText";
import { parseSpotlightQuery } from "../spotlightQuery";

describe("nothingFoundText", () => {
  it("says nothing while the answer is on its way", () => {
    // "Nobody here by that name" before the members have arrived reads as
    // the person not existing.
    expect(nothingFoundText(parseSpotlightQuery("@neo"), true, true)).toBe("");
  });

  it("answers the question that was asked once it has settled", () => {
    expect(nothingFoundText(parseSpotlightQuery("@neo"), true, false)).toBe(
      "Nobody here by that name...",
    );
    expect(nothingFoundText(parseSpotlightQuery("zzz"), true, false)).toBe(
      "No pages found... try @ for members",
    );
  });
});

describe("isPaletteShortcut", () => {
  const body = document.createElement("div");
  const key = (init: KeyboardEventInit, target: EventTarget = body) => {
    const e = new KeyboardEvent("keydown", init);
    Object.defineProperty(e, "target", { value: target });
    return e;
  };

  it("is Ctrl+K or Cmd+K", () => {
    expect(isPaletteShortcut(key({ key: "k", ctrlKey: true }))).toBe(true);
    expect(isPaletteShortcut(key({ key: "K", metaKey: true }))).toBe(true);
  });

  it("leaves Ctrl+Shift+K and Ctrl+Alt+K to the browser", () => {
    // Firefox's web console is Ctrl+Shift+K.
    expect(
      isPaletteShortcut(key({ key: "K", ctrlKey: true, shiftKey: true })),
    ).toBe(false);
    expect(
      isPaletteShortcut(key({ key: "k", ctrlKey: true, altKey: true })),
    ).toBe(false);
  });

  it("leaves the keys to a field being typed in", () => {
    const input = document.createElement("input");

    expect(isPaletteShortcut(key({ key: "k", ctrlKey: true }, input))).toBe(
      false,
    );
  });
});
