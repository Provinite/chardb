import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useHeldWhile } from "../useHeldWhile";

describe("useHeldWhile", () => {
  it("passes the value through while not holding", () => {
    const { result, rerender } = renderHook(
      ({ value, hold }) => useHeldWhile(value, hold),
      { initialProps: { value: "a", hold: false } },
    );

    rerender({ value: "b", hold: false });

    expect(result.current).toBe("b");
  });

  it("keeps the last value from before the hold", () => {
    const { result, rerender } = renderHook(
      ({ value, hold }) => useHeldWhile(value, hold),
      { initialProps: { value: "results", hold: false } },
    );

    rerender({ value: "nothing yet", hold: true });

    expect(result.current).toBe("results");
  });

  it("lets go once the hold ends", () => {
    const { result, rerender } = renderHook(
      ({ value, hold }) => useHeldWhile(value, hold),
      { initialProps: { value: "old", hold: false } },
    );

    rerender({ value: "loading", hold: true });
    rerender({ value: "new", hold: false });

    expect(result.current).toBe("new");
  });
});
