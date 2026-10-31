import React, { Suspense, lazy } from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const addScreen = () => {
  const el = document.createElement("div");
  el.id = "boot-screen";
  el.style.opacity = "0";
  document.body.appendChild(el);
};
const screenUp = () => document.getElementById("boot-screen") !== null;

// The boot screen's holds are module state, so each test gets a fresh copy of
// both modules from one registry.
const load = async () => {
  vi.resetModules();
  const [{ RouteFallback }, { useDismissBootScreen }] = await Promise.all([
    import("../RouteFallback"),
    import("../../hooks/useBootScreen"),
  ]);
  return { RouteFallback, useDismissBootScreen };
};

/** A lazy page whose chunk arrives when the test says so. */
const deferredPage = () => {
  let arrive = () => {};
  const Page = lazy(
    () =>
      new Promise<{ default: React.FC }>((resolve) => {
        arrive = () => resolve({ default: () => <p>the page</p> });
      }),
  );
  return { Page, arrive: () => arrive() };
};

describe("RouteFallback", () => {
  beforeEach(addScreen);
  afterEach(() => document.getElementById("boot-screen")?.remove());

  it("keeps the startup screen up while the first page's chunk loads", async () => {
    const { RouteFallback, useDismissBootScreen } = await load();
    const Shell = ({ children }: { children: React.ReactNode }) => {
      useDismissBootScreen();
      return <>{children}</>;
    };
    const { Page, arrive } = deferredPage();

    render(
      <Shell>
        <Suspense fallback={<RouteFallback />}>
          <Page />
        </Suspense>
      </Shell>,
    );
    expect(screenUp()).toBe(true);

    await act(async () => arrive());
    expect(await screen.findByText("the page")).toBeTruthy();
    expect(screenUp()).toBe(false);
  });
});
