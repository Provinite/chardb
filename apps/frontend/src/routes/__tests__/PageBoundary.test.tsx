import { lazy } from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PageBoundary } from "../PageBoundary";
import { TransitionRouter } from "../TransitionRouter";

vi.mock("../../components/PageLoadError", () => ({
  PageLoadError: () => <p>error view</p>,
}));
vi.mock("../RouteFallback", () => ({
  RouteFallback: () => <p>fallback</p>,
}));

const Broken = () => {
  throw new Error("chunk failed");
};

describe("PageBoundary", () => {
  const swallow = (event: ErrorEvent) => event.preventDefault();
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    window.addEventListener("error", swallow);
  });
  afterEach(() => {
    window.removeEventListener("error", swallow);
    window.history.replaceState(null, "", "/");
    vi.restoreAllMocks();
  });

  it("keeps the error view up while the next page's code loads", async () => {
    let arrive = () => {};
    const Next = lazy(
      () =>
        new Promise<{ default: React.FC }>((resolve) => {
          arrive = () => resolve({ default: () => <p>the next page</p> });
        }),
    );

    render(
      <TransitionRouter>
        <Link to="/next">go</Link>
        <PageBoundary>
          <Routes>
            <Route path="/" element={<Broken />} />
            <Route path="/next" element={<Next />} />
          </Routes>
        </PageBoundary>
      </TransitionRouter>,
    );
    expect(screen.getByText("error view")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("link", { name: "go" }));
    expect(screen.queryByText("fallback")).toBeNull();
    expect(screen.getByText("error view")).toBeInTheDocument();

    await act(async () => arrive());
    expect(await screen.findByText("the next page")).toBeInTheDocument();
  });
});
