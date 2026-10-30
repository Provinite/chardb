/**
 * Grid track sizes. `fr` wraps the share in `minmax(0, …)` because a bare
 * `1fr` cannot shrink below its content, so one long word could push the grid
 * wider than its container.
 */
export const track = {
  /** A share of the remaining width; `min` is a size token it never shrinks below. */
  fr: (share: number, min = "0") => `minmax(${min}, ${share}fr)`,
  /** A fixed-width column, from a size token. */
  fixed: (size: string) => size,
  /** A column as wide as its content. Not for `DataTable`, where rows size their own grids. */
  content: "max-content",
} as const;
