import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "../__tests__/render";
import { timingMs } from "../theme/tokens";
import { useLoaderVisible } from "./useLoaderVisible";

const { delay, minVisible } = timingMs.loader;

let seen: boolean | undefined;

function Probe({ busy }: { busy: boolean }) {
  seen = useLoaderVisible(busy);
  return null;
}

const wait = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

beforeEach(() => {
  vi.useFakeTimers();
  seen = undefined;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useLoaderVisible", () => {
  it("is hidden while idle", () => {
    mount(<Probe busy={false} />);

    expect(seen).toBe(false);
  });

  it("waits the loader delay before showing", () => {
    mount(<Probe busy />);

    expect(seen).toBe(false);
    wait(delay - 1);
    expect(seen).toBe(false);
    wait(1);
    expect(seen).toBe(true);
  });

  it("never shows for work that ends inside the delay", () => {
    const { rerender } = mount(<Probe busy />);

    wait(delay - 1);
    rerender(<Probe busy={false} />);
    wait(delay + minVisible);

    expect(seen).toBe(false);
  });

  it("stays shown for the minimum time once it has appeared", () => {
    const { rerender } = mount(<Probe busy />);

    wait(delay + 100);
    rerender(<Probe busy={false} />);

    expect(seen).toBe(true);
    wait(minVisible - 101);
    expect(seen).toBe(true);
    wait(1);
    expect(seen).toBe(false);
  });

  it("hides at once when it has already shown for the minimum time", () => {
    const { rerender } = mount(<Probe busy />);

    wait(delay + minVisible);
    rerender(<Probe busy={false} />);

    expect(seen).toBe(false);
  });

  it("stays shown when work starts again during the hold", () => {
    const { rerender } = mount(<Probe busy />);

    wait(delay);
    rerender(<Probe busy={false} />);
    wait(100);
    rerender(<Probe busy />);
    wait(minVisible);

    expect(seen).toBe(true);
  });

  it("waits the full delay again for a second run of work", () => {
    const { rerender } = mount(<Probe busy />);

    wait(delay + minVisible);
    rerender(<Probe busy={false} />);
    rerender(<Probe busy />);

    expect(seen).toBe(false);
    wait(delay);
    expect(seen).toBe(true);
  });

  it("clears its timers on unmount", () => {
    const { rerender } = mount(<Probe busy />);
    rerender(<></>);

    expect(vi.getTimerCount()).toBe(0);
  });
});
