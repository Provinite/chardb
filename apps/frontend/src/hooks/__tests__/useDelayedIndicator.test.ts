import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { timingMs } from "@chardb/ui/theme";
import { useDelayedIndicator } from "../useDelayedIndicator";

const { delay, minVisible } = timingMs.loader;

describe("useDelayedIndicator", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

  it("never shows for work that finishes inside the delay", () => {
    const { result, rerender } = renderHook(
      ({ busy }) => useDelayedIndicator(busy),
      { initialProps: { busy: true } },
    );
    advance(delay - 1);
    expect(result.current).toBe(false);
    rerender({ busy: false });
    advance(delay * 2);
    expect(result.current).toBe(false);
  });

  it("shows once the work outlasts the delay", () => {
    const { result } = renderHook(() => useDelayedIndicator(true));
    advance(delay - 1);
    expect(result.current).toBe(false);
    advance(1);
    expect(result.current).toBe(true);
  });

  it("stays up for the minimum once shown, then hides", () => {
    const { result, rerender } = renderHook(
      ({ busy }) => useDelayedIndicator(busy),
      { initialProps: { busy: true } },
    );
    advance(delay);
    expect(result.current).toBe(true);
    rerender({ busy: false });
    advance(minVisible - 1);
    expect(result.current).toBe(true);
    advance(1);
    expect(result.current).toBe(false);
  });

  it("hides as soon as the work ends when the minimum has already passed", () => {
    const { result, rerender } = renderHook(
      ({ busy }) => useDelayedIndicator(busy),
      { initialProps: { busy: true } },
    );
    advance(delay + minVisible + 100);
    rerender({ busy: false });
    expect(result.current).toBe(false);
  });
});
