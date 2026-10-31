import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "../../__tests__/test-utils";
import { RouteErrorBoundary } from "../RouteErrorBoundary";

const Broken = () => {
  throw new Error("chunk failed");
};

describe("RouteErrorBoundary", () => {
  // React and jsdom report every caught error; these ones are expected.
  const swallow = (event: ErrorEvent) => event.preventDefault();
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    window.addEventListener("error", swallow);
  });
  afterEach(() => {
    window.removeEventListener("error", swallow);
    vi.restoreAllMocks();
  });

  it("renders the page while nothing is wrong", () => {
    render(
      <RouteErrorBoundary resetKey="/">
        <p>the page</p>
      </RouteErrorBoundary>,
    );
    expect(screen.getByText("the page")).toBeInTheDocument();
  });

  it("replaces a page that fails with a way to reload", async () => {
    const reload = vi.fn();
    render(
      <RouteErrorBoundary resetKey="/" reload={reload}>
        <Broken />
      </RouteErrorBoundary>,
    );

    expect(
      screen.getByRole("heading", { name: "This page couldn't load" }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reload" }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("tries again once the visitor goes to another page", () => {
    const { rerender } = render(
      <RouteErrorBoundary resetKey="/broken">
        <Broken />
      </RouteErrorBoundary>,
    );
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();

    rerender(
      <RouteErrorBoundary resetKey="/fine">
        <p>the next page</p>
      </RouteErrorBoundary>,
    );
    expect(screen.getByText("the next page")).toBeInTheDocument();
  });
});
