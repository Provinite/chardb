import { describe, expect, it } from "vitest";
import { placeFloating, type PlaceInput } from "./placeFloating";

const viewport = { width: 1000, height: 800 };
const floating = { width: 200, height: 100 };
/** A 100×40 button with plenty of room on every side. */
const anchor = { top: 300, left: 450, width: 100, height: 40 };

const place = (over: Partial<PlaceInput> = {}) =>
  placeFloating({
    anchor,
    floating,
    viewport,
    side: "bottom",
    align: "center",
    gap: 8,
    margin: 8,
    ...over,
  });

describe("placeFloating", () => {
  it("sits below the anchor, centred, a gap away", () => {
    expect(place()).toMatchObject({ side: "bottom", top: 348, left: 400 });
  });

  it("points the arrow at the anchor's centre", () => {
    // The anchor's centre is 500; the panel starts at 400.
    expect(place().arrow).toBe(100);
  });

  it("lines up its end with the anchor's for align end", () => {
    expect(place({ align: "end" }).left).toBe(350);
  });

  it("lines up its start with the anchor's for align start", () => {
    expect(place({ align: "start" }).left).toBe(450);
  });

  it("flips above when there is no room below and room above", () => {
    const low = { ...anchor, top: 720 };

    expect(place({ anchor: low })).toMatchObject({ side: "top", top: 612 });
  });

  it("stays on its side when neither side has room", () => {
    const tall = { width: 200, height: 790 };

    expect(place({ floating: tall }).side).toBe("bottom");
  });

  it("slides left to stay on screen at the right edge", () => {
    const right = { ...anchor, left: 940, width: 50 };
    const placed = place({ anchor: right });

    expect(placed.left).toBe(792);
    // Still pointing at the anchor, now off the panel's centre.
    expect(placed.arrow).toBe(173);
  });

  it("slides right to stay on screen at the left edge", () => {
    const left = { ...anchor, left: 10, width: 50 };

    expect(place({ anchor: left }).left).toBe(8);
  });

  it("keeps the arrow on the panel when the anchor is past its corner", () => {
    const corner = { ...anchor, left: 995, width: 4 };

    // At most the panel's width less the arrow's inset.
    expect(place({ anchor: corner, arrowInset: 12 }).arrow).toBe(188);
  });

  it("starts at the margin when it is wider than the screen", () => {
    const wide = { width: 1200, height: 100 };

    expect(place({ floating: wide }).left).toBe(8);
  });

  it("places beside the anchor for side right, flipping left when needed", () => {
    expect(place({ side: "right" })).toMatchObject({
      side: "right",
      left: 558,
      top: 270,
    });

    const nearRight = { ...anchor, left: 850 };
    expect(place({ side: "right", anchor: nearRight })).toMatchObject({
      side: "left",
      left: 642,
    });
  });
});
