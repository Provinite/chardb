/**
 * Container widths, in `rem`, at which the layout primitives change layout.
 * Plain numbers rather than tokens: container queries cannot read CSS
 * variables.
 */
export const containers = {
  xs: 20,
  sm: 30,
  md: 40,
  lg: 50,
  xl: 60,
} as const;

export type ContainerSize = keyof typeof containers;
