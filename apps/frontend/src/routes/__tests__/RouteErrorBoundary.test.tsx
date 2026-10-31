import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "styled-components";
import { lightTheme } from "@chardb/ui";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RouteErrorBoundary } from "../RouteErrorBoundary";

const Broken = () => {
  throw new Error("chunk failed");
};

const renderBoundary = (
  resetKey: string,
  child: React.ReactNode,
  reload = vi.fn(),
) =>
  render(
    <ThemeProvider theme={lightTheme}>
      <RouteErrorBoundary resetKey={resetKey} reload={reload}>
        {child}
      </RouteErrorBoundary>
    </ThemeProvider>,
  );

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
    renderBoundary("/", <p>the page</p>);
    expect(screen.getByText("the page")).toBeInTheDocument();
  });

  it("replaces a page that fails with a way to reload", async () => {
    const reload = vi.fn();
    renderBoundary("/", <Broken />, reload);

    expect(
      screen.getByRole("heading", { name: "This page couldn't load" }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reload" }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("tries again once the visitor goes to another page", () => {
    const { rerender } = renderBoundary("/broken", <Broken />);
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={lightTheme}>
        <RouteErrorBoundary resetKey="/fine" reload={vi.fn()}>
          <p>the next page</p>
        </RouteErrorBoundary>
      </ThemeProvider>,
    );
    expect(screen.getByText("the next page")).toBeInTheDocument();
  });
});
