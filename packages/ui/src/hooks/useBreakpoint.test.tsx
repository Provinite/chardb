import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { render } from "../__tests__/render";
import { mq } from "../css/media";
import { useBreakpoint } from "./useBreakpoint";

type Listener = (event: { matches: boolean }) => void;

/** A matchMedia whose matches the test can flip, with listeners that fire. */
const mockMatchMedia = (initial: boolean) => {
  let matches = initial;
  const listeners = new Set<Listener>();
  const queries: string[] = [];
  vi.stubGlobal("matchMedia", (query: string) => {
    queries.push(query);
    return {
      get matches() {
        return matches;
      },
      addEventListener: (_: "change", l: Listener) => listeners.add(l),
      removeEventListener: (_: "change", l: Listener) => listeners.delete(l),
    };
  });
  return {
    queries,
    set: (next: boolean) => {
      matches = next;
      act(() => listeners.forEach((l) => l({ matches: next })));
    },
  };
};

const Probe = () => <span>{useBreakpoint("sm") ? "wide" : "narrow"}</span>;

afterEach(() => vi.unstubAllGlobals());

describe("useBreakpoint", () => {
  it("asks for the breakpoint's own media query", () => {
    const media = mockMatchMedia(false);
    render(<Probe />);
    expect(media.queries).toContain(mq("sm"));
  });

  it("knows the answer on the first render", () => {
    mockMatchMedia(true);
    expect(render(<Probe />).textContent).toBe("wide");
  });

  it("follows the query as the window changes", () => {
    const media = mockMatchMedia(false);
    const container = render(<Probe />);
    expect(container.textContent).toBe("narrow");
    media.set(true);
    expect(container.textContent).toBe("wide");
  });
});
