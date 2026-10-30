import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BOOT_SCREEN_ID, dismissBootScreen } from "../bootScreen";

const addScreen = (opacity: string) => {
  const el = document.createElement("div");
  el.id = BOOT_SCREEN_ID;
  el.style.opacity = opacity;
  document.body.appendChild(el);
  return el;
};

describe("dismissBootScreen", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    document.getElementById(BOOT_SCREEN_ID)?.remove();
  });

  it("removes a screen that never became visible at once", () => {
    addScreen("0");
    dismissBootScreen();
    expect(document.getElementById(BOOT_SCREEN_ID)).toBeNull();
  });

  it("fades a visible screen out, then removes it", () => {
    const el = addScreen("1");
    dismissBootScreen();
    expect(document.getElementById(BOOT_SCREEN_ID)).toBe(el);
    expect(el.style.opacity).toBe("0");
    expect(el.style.transition).toContain("opacity");
    // Clicks reach the app while it fades.
    expect(el.style.pointerEvents).toBe("none");

    el.dispatchEvent(new Event("transitionend"));
    expect(document.getElementById(BOOT_SCREEN_ID)).toBeNull();
  });

  it("removes it even if the transition never reports ending", () => {
    addScreen("1");
    dismissBootScreen();
    vi.advanceTimersByTime(1000);
    expect(document.getElementById(BOOT_SCREEN_ID)).toBeNull();
  });

  it("stays up once a page that leaves for another origin holds it", async () => {
    vi.resetModules();
    const fresh = await import("../bootScreen");
    addScreen("1");
    fresh.holdBootScreen();
    fresh.dismissBootScreen();
    vi.advanceTimersByTime(1000);
    expect(document.getElementById(BOOT_SCREEN_ID)).not.toBeNull();
  });

  it("dismisses on release when the page turns out to stay", async () => {
    vi.resetModules();
    const fresh = await import("../bootScreen");
    addScreen("0");
    fresh.holdBootScreen();
    fresh.dismissBootScreen();
    expect(document.getElementById(BOOT_SCREEN_ID)).not.toBeNull();
    fresh.releaseBootScreen();
    expect(document.getElementById(BOOT_SCREEN_ID)).toBeNull();
  });

  it("stays up until every hold is released", async () => {
    vi.resetModules();
    const fresh = await import("../bootScreen");
    addScreen("0");
    fresh.holdBootScreen();
    fresh.holdBootScreen();
    fresh.releaseBootScreen();
    expect(document.getElementById(BOOT_SCREEN_ID)).not.toBeNull();
    fresh.releaseBootScreen();
    expect(document.getElementById(BOOT_SCREEN_ID)).toBeNull();
  });

  it("does nothing when there is no screen, or when called twice", () => {
    expect(() => dismissBootScreen()).not.toThrow();
    const el = addScreen("1");
    dismissBootScreen();
    el.style.opacity = "1";
    dismissBootScreen();
    expect(el.style.opacity).toBe("1");
  });
});
