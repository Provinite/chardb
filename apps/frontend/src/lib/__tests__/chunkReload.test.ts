import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RELOAD_GUARD_MS, reloadOnStaleChunk } from "../chunkReload";

const preloadError = () => {
  const event = new Event("vite:preloadError", { cancelable: true });
  window.dispatchEvent(event);
  return event;
};

/** setupTests stubs session storage to forget everything; this one keeps it. */
const memoryStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
};

const blockedStorage = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
};

const useStorage = (storage: object) =>
  Object.defineProperty(window, "sessionStorage", {
    value: storage,
    writable: true,
  });

describe("reloadOnStaleChunk", () => {
  let reload: ReturnType<typeof vi.fn<() => void>>;
  let stop: () => void;
  const stubbed = window.sessionStorage;

  /** What a reload amounts to here: a fresh page, same tab, same session. */
  const freshPage = () => {
    stop();
    stop = reloadOnStaleChunk(reload);
  };

  beforeEach(() => {
    vi.useFakeTimers();
    useStorage(memoryStorage());
    reload = vi.fn<() => void>();
    stop = reloadOnStaleChunk(reload);
  });
  afterEach(() => {
    stop();
    useStorage(stubbed);
    vi.useRealTimers();
  });

  it("reloads the page when a chunk fails to load", () => {
    const event = preloadError();
    expect(reload).toHaveBeenCalledTimes(1);
    // Handled: Vite does not rethrow it.
    expect(event.defaultPrevented).toBe(true);
  });

  it("does not reload again when the reloaded page fails straight away", () => {
    preloadError();
    freshPage();
    const event = preloadError();
    expect(reload).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(false);
  });

  it("reloads for a failure long after the last reload", () => {
    preloadError();
    freshPage();
    vi.advanceTimersByTime(RELOAD_GUARD_MS + 1);
    preloadError();
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it("does not reload while offline, which a reload cannot fix", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const event = preloadError();
    expect(reload).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
    vi.restoreAllMocks();
  });

  it("does not reload when it cannot remember having reloaded", () => {
    useStorage(blockedStorage);
    const event = preloadError();
    expect(reload).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });
});
