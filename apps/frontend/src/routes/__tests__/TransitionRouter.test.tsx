import React, { Suspense, lazy } from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import {
  TransitionRouter,
  useRouteTransitionPending,
} from "../TransitionRouter";

/** A lazy page whose chunk arrives when the test says so. */
const deferredPage = (text: string) => {
  let arrive = () => {};
  const Page = lazy(
    () =>
      new Promise<{ default: React.FC }>((resolve) => {
        arrive = () => resolve({ default: () => <p>{text}</p> });
      }),
  );
  return { Page, arrive: () => arrive() };
};

const Pending: React.FC = () => (
  <output>{useRouteTransitionPending() ? "pending" : "idle"}</output>
);

describe("TransitionRouter", () => {
  afterEach(() => window.history.replaceState(null, "", "/"));

  it("keeps the current page on screen while the next page's code loads", async () => {
    const user = userEvent.setup();
    const next = deferredPage("the next page");

    render(
      <TransitionRouter>
        <Pending />
        <Suspense fallback={<p>fallback</p>}>
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <p>the first page</p>
                  <Link to="/next">go</Link>
                </>
              }
            />
            <Route path="/next" element={<next.Page />} />
          </Routes>
        </Suspense>
      </TransitionRouter>,
    );
    expect(screen.getByRole("status").textContent).toBe("idle");

    await user.click(screen.getByRole("link", { name: "go" }));

    expect(screen.getByText("the first page")).toBeTruthy();
    expect(screen.queryByText("fallback")).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("pending");
    // The address bar moves at once, as with any client navigation.
    expect(window.location.pathname).toBe("/next");

    await act(async () => next.arrive());

    expect(await screen.findByText("the next page")).toBeTruthy();
    expect(screen.queryByText("the first page")).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("idle");
  });
});
