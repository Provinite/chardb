import { afterEach, describe, expect, it, vi } from "vitest";
import { reducedMotionQuery } from "../css/media";
import { scrollToElement, scrollToPosition } from "./scroll";

const preferReducedMotion = (reduce: boolean) => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query === reducedMotionQuery && reduce,
    })),
  );
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("scrollToElement", () => {
  it("scrolls smoothly by default", () => {
    preferReducedMotion(false);
    const el = document.createElement("div");
    el.scrollIntoView = vi.fn();
    scrollToElement(el, { block: "start" });
    expect(el.scrollIntoView).toHaveBeenCalledWith({
      block: "start",
      behavior: "smooth",
    });
  });

  it("jumps under reduced motion", () => {
    preferReducedMotion(true);
    const el = document.createElement("div");
    el.scrollIntoView = vi.fn();
    scrollToElement(el);
    expect(el.scrollIntoView).toHaveBeenCalledWith({ behavior: "instant" });
  });
});

describe("scrollToPosition", () => {
  it("scrolls the window smoothly by default", () => {
    preferReducedMotion(false);
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    scrollToPosition({ top: 0 });
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("scrolls a given element, jumping under reduced motion", () => {
    preferReducedMotion(true);
    const el = document.createElement("div");
    el.scrollTo = vi.fn();
    scrollToPosition({ top: 120 }, el);
    expect(el.scrollTo).toHaveBeenCalledWith({ top: 120, behavior: "instant" });
  });
});
