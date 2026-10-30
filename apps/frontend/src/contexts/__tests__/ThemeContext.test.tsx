import React from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as preference from "../../lib/themePreference";
import { ThemeProvider, useTheme } from "../ThemeContext";

type Listener = (event: { matches: boolean }) => void;

let systemDark = false;
let systemListeners: Listener[] = [];

const installMatchMedia = () => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === "(prefers-color-scheme: dark)" && systemDark,
    media: query,
    addEventListener: (_: string, listener: Listener) =>
      systemListeners.push(listener),
    removeEventListener: (_: string, listener: Listener) => {
      systemListeners = systemListeners.filter((l) => l !== listener);
    },
  }));
};

const changeSystem = (dark: boolean) => {
  systemDark = dark;
  act(() => systemListeners.forEach((l) => l({ matches: dark })));
};

const Probe: React.FC = () => {
  const { mode, toggleTheme } = useTheme();
  return (
    <button type="button" onClick={toggleTheme}>
      {mode}
    </button>
  );
};

const renderProvider = () =>
  render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  );

describe("ThemeProvider", () => {
  let write: ReturnType<typeof vi.spyOn>;
  let read: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    systemDark = false;
    systemListeners = [];
    installMatchMedia();
    write = vi
      .spyOn(preference, "writeThemePreference")
      .mockImplementation(() => {});
    read = vi.spyOn(preference, "readThemePreference").mockReturnValue(null);
    vi.mocked(window.localStorage.getItem).mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.documentElement.removeAttribute("data-theme");
  });

  it("starts in the theme the boot script set, without deciding again", () => {
    document.documentElement.dataset.theme = "dark";
    renderProvider();
    expect(screen.getByRole("button")).toHaveTextContent("dark");
  });

  it("does not save a preference just by mounting", () => {
    document.documentElement.dataset.theme = "light";
    renderProvider();
    expect(write).not.toHaveBeenCalled();
  });

  it("saves the choice and applies it to the page when toggled", () => {
    document.documentElement.dataset.theme = "light";
    renderProvider();
    act(() => screen.getByRole("button").click());
    expect(write).toHaveBeenCalledWith("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("follows the system until the user picks", () => {
    document.documentElement.dataset.theme = "light";
    renderProvider();
    changeSystem(true);
    expect(screen.getByRole("button")).toHaveTextContent("dark");

    act(() => screen.getByRole("button").click());
    changeSystem(true);
    expect(screen.getByRole("button")).toHaveTextContent("light");
  });

  it("ignores the system when a choice is already saved", () => {
    read.mockReturnValue("light");
    document.documentElement.dataset.theme = "light";
    renderProvider();
    changeSystem(true);
    expect(screen.getByRole("button")).toHaveTextContent("light");
  });

  it("moves a choice saved under the old localStorage key into the cookie", () => {
    vi.mocked(window.localStorage.getItem).mockImplementation((key) =>
      key === preference.LEGACY_THEME_STORAGE_KEY ? "dark" : null,
    );
    document.documentElement.dataset.theme = "dark";
    renderProvider();
    expect(write).toHaveBeenCalledWith("dark");
    expect(window.localStorage.removeItem).toHaveBeenCalledWith(
      preference.LEGACY_THEME_STORAGE_KEY,
    );
  });
});
