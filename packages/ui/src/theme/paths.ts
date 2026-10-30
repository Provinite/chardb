/** Every leaf path of a nested object of strings, such as `action.primary.bgHover`. */
export type Leaves<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Leaves<T[K]>}`;
}[keyof T & string];

/** A nested object of strings flattened to one level, keyed by path. */
export const flatten = <T extends object>(
  node: T,
  prefix = "",
): Record<Leaves<T>, string> =>
  Object.fromEntries(
    Object.entries(node).flatMap(([key, value]) =>
      typeof value === "string"
        ? [[`${prefix}${key}`, value]]
        : Object.entries(flatten(value as object, `${prefix}${key}.`)),
    ),
  ) as Record<Leaves<T>, string>;
