import { describe, expect, it } from "vitest";
import { darkTheme, lightTheme } from "./legacy";
import { sharedTokens } from "./tokens";

// The styled-components theme as it was before it read from the palette.
// styled-components pages must look the same, so the bridge must match it.
const before = {
  light: {
    colors: {
      primary: "#8b5cf6",
      secondary: "#059669",
      background: "#ffffff",
      surface: "#f8fafc",
      text: { primary: "#1e293b", secondary: "#475569", muted: "#94a3b8" },
      border: "#e2e8f0",
      error: "#ef4444",
      warning: "#f59e0b",
      success: "#10b981",
      info: "#06b6d4",
      danger: "#dc2626",
      dangerHover: "#b91c1c",
    },
    spacing: {
      xs: "0.25rem",
      sm: "0.5rem",
      md: "1rem",
      lg: "1.5rem",
      xl: "2rem",
      xxl: "3rem",
    },
    typography: {
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: {
        xs: "0.75rem",
        sm: "0.875rem",
        md: "1rem",
        lg: "1.125rem",
        xl: "1.25rem",
        xxl: "1.5rem",
      },
      fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
    },
    borderRadius: {
      sm: "0.25rem",
      md: "0.375rem",
      lg: "0.5rem",
      full: "9999px",
    },
    shadows: {
      sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
      lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    },
  },
  darkColors: {
    primary: "#8b5cf6",
    secondary: "#22c55e",
    background: "#0f172a",
    surface: "#1e293b",
    text: { primary: "#f1f5f9", secondary: "#cbd5e1", muted: "#64748b" },
    border: "#334155",
    error: "#f87171",
    warning: "#fbbf24",
    success: "#22c55e",
    info: "#22d3ee",
    danger: "#f87171",
    dangerHover: "#ef4444",
  },
};

describe("legacy styled-components theme", () => {
  it("keeps the light theme's values", () => {
    expect(lightTheme).toEqual(before.light);
  });

  it("keeps the dark theme's values", () => {
    expect(darkTheme).toEqual({ ...before.light, colors: before.darkColors });
  });

  it("shares no objects with the vanilla-extract tokens", () => {
    expect(lightTheme.spacing).not.toBe(sharedTokens.space);
    expect(lightTheme.typography.fontSize).not.toBe(sharedTokens.font.size);
    expect(lightTheme.borderRadius).not.toBe(sharedTokens.radius);
    expect(lightTheme.shadows).not.toBe(sharedTokens.shadow);
  });
});
