import type { StyleRule } from "@vanilla-extract/css";

type ContainerStyle = NonNullable<StyleRule["@container"]>[string];

/**
 * Container query rules for one container, as the contents of the
 * `"@container"` key. Thresholds are numbers of `rem`, emitted smallest-first:
 * `postcss-sort-media-queries` sorts only `@media`.
 */
export const cq = (
  container: string,
  thresholds: Record<number, ContainerStyle>,
): Record<string, ContainerStyle> =>
  Object.fromEntries(
    Object.entries(thresholds)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([rem, rules]) => [`${container} (min-width: ${rem}rem)`, rules]),
  );
