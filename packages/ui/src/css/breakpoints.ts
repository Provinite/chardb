/**
 * Viewport breakpoints, in `em` so they follow the user's browser font size.
 * Plain numbers rather than tokens: media queries cannot read CSS variables.
 */
export const breakpoints = {
  sm: 40,
  md: 48,
  lg: 64,
  xl: 80,
  xxl: 96,
} as const;

export type Breakpoint = keyof typeof breakpoints;
