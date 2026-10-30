/**
 * Raw colour values. Private to the theme module: components use the
 * semantic tokens in tokens.ts, never these.
 *
 * Names follow the Tailwind scale the existing colours were taken from, so a
 * new state shade is the nearest step on the same scale.
 */
export const palette = {
  white: "#ffffff",

  slate50: "#f8fafc",
  slate100: "#f1f5f9",
  slate200: "#e2e8f0",
  slate300: "#cbd5e1",
  slate400: "#94a3b8",
  slate500: "#64748b",
  slate600: "#475569",
  slate700: "#334155",
  slate800: "#1e293b",
  slate900: "#0f172a",
  slate950: "#020617",

  violet50: "#f5f3ff",
  violet300: "#c4b5fd",
  violet400: "#a78bfa",
  violet500: "#8b5cf6",
  violet600: "#7c3aed",
  violet700: "#6d28d9",
  violet800: "#5b21b6",
  violet950: "#2e1065",

  emerald50: "#ecfdf5",
  emerald200: "#a7f3d0",
  emerald500: "#10b981",
  emerald600: "#059669",
  emerald700: "#047857",
  emerald800: "#065f46",
  emerald900: "#064e3b",

  green500: "#22c55e",
  green700: "#15803d",
  green800: "#166534",
  green900: "#14532d",
  green950: "#052e16",

  red50: "#fef2f2",
  red200: "#fecaca",
  red400: "#f87171",
  red500: "#ef4444",
  red600: "#dc2626",
  red700: "#b91c1c",
  red800: "#991b1b",
  red950: "#450a0a",

  amber50: "#fffbeb",
  amber200: "#fde68a",
  amber400: "#fbbf24",
  amber500: "#f59e0b",
  amber700: "#b45309",
  amber800: "#92400e",
  amber950: "#451a03",

  cyan50: "#ecfeff",
  cyan200: "#a5f3fc",
  cyan400: "#22d3ee",
  cyan500: "#06b6d4",
  cyan700: "#0e7490",
  cyan800: "#155e75",
  cyan950: "#083344",

  scrim: "rgb(0 0 0 / 0.5)",
};
