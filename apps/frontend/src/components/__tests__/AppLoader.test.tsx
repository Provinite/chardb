/**
 * The loader stays invisible for a short grace period, so a load that finishes
 * quickly goes straight from blank to the page instead of blinking the loader
 * in and out.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { lightTheme } from "@chardb/ui";
import { AppLoader, APP_LOADER_DELAY_MS } from "../AppLoader";

const renderLoader = () =>
  render(
    <ThemeProvider theme={lightTheme}>
      <AppLoader />
    </ThemeProvider>,
  );

describe("AppLoader", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("announces itself to assistive technology", () => {
    renderLoader();
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
  });

  it("is hidden until the grace period passes", () => {
    renderLoader();
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("data-visible", "false");

    act(() => {
      vi.advanceTimersByTime(APP_LOADER_DELAY_MS);
    });

    expect(status).toHaveAttribute("data-visible", "true");
  });
});
