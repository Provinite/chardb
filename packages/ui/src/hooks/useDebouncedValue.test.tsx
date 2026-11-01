import { act, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../__tests__/render";
import { useDebouncedValue } from "./useDebouncedValue";

let seen: string | undefined;
let set: (value: string) => void = () => {};

/** Holds a value the test changes, and reports its debounced copy. */
function Probe() {
  const [value, setValue] = useState("a");
  set = setValue;
  seen = useDebouncedValue(value, 200);
  return null;
}

const wait = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useDebouncedValue", () => {
  it("starts at the value it was given", () => {
    render(<Probe />);

    expect(seen).toBe("a");
  });

  it("keeps the old value until the new one has held still for the delay", () => {
    render(<Probe />);

    act(() => set("ab"));
    wait(199);
    expect(seen).toBe("a");

    wait(1);
    expect(seen).toBe("ab");
  });

  it("starts the wait over on every change", () => {
    render(<Probe />);

    act(() => set("ab"));
    wait(150);
    act(() => set("abc"));
    wait(150);
    expect(seen).toBe("a");

    wait(50);
    expect(seen).toBe("abc");
  });
});
