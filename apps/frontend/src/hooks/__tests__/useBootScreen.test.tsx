import React from "react";
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const addScreen = () => {
  const el = document.createElement("div");
  el.id = "boot-screen";
  el.style.opacity = "0";
  document.body.appendChild(el);
};
const screenUp = () => document.getElementById("boot-screen") !== null;

// The hold is module state, so each test gets a fresh copy.
const load = async () => {
  vi.resetModules();
  return import("../useBootScreen");
};

describe("useHoldBootScreen", () => {
  beforeEach(addScreen);
  afterEach(() => document.getElementById("boot-screen")?.remove());

  it("does not dismiss anything when it never held", async () => {
    const { useHoldBootScreen } = await load();
    const Gate = () => {
      useHoldBootScreen(false);
      return null;
    };
    render(<Gate />);
    expect(screenUp()).toBe(true);
  });

  it("keeps the screen up past a dismissal while leaving", async () => {
    const { useHoldBootScreen, useDismissBootScreen } = await load();
    const Redirect = () => {
      useHoldBootScreen(true);
      return null;
    };
    const Shell = ({ children }: { children: React.ReactNode }) => {
      useDismissBootScreen();
      return <>{children}</>;
    };
    render(
      <Shell>
        <Redirect />
      </Shell>,
    );
    expect(screenUp()).toBe(true);
  });

  it("dismisses once a page it held turns out to stay", async () => {
    const { useHoldBootScreen } = await load();
    const Guard = ({ leaving }: { leaving: boolean }) => {
      useHoldBootScreen(leaving);
      return null;
    };
    const { rerender } = render(<Guard leaving />);
    expect(screenUp()).toBe(true);
    rerender(<Guard leaving={false} />);
    expect(screenUp()).toBe(false);
  });

  it("releases its hold when it unmounts while holding", async () => {
    const { useHoldBootScreen } = await load();
    const Guard = () => {
      useHoldBootScreen(true);
      return null;
    };
    const { unmount } = render(<Guard />);
    expect(screenUp()).toBe(true);
    unmount();
    expect(screenUp()).toBe(false);
  });
});
