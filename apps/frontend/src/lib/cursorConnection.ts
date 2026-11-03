import type { FieldPolicy } from "@apollo/client";

/**
 * Merges one page of a cursor-paged connection into what is cached: a page
 * fetched after a cursor appends, any other page replaces.
 */
export function mergeCursorPage<P extends { nodes: readonly unknown[] }>(
  existing: P | undefined,
  incoming: P,
  after: string | null | undefined,
): P {
  if (!after || !existing) return incoming;
  return { ...incoming, nodes: [...existing.nodes, ...incoming.nodes] };
}

/**
 * Field policy for a connection paged with `after`. `keyArgs` are the
 * arguments that pick a different list; `after` never does.
 */
export function cursorConnection(keyArgs: string[]): FieldPolicy {
  return {
    keyArgs,
    merge(existing, incoming, { args }) {
      return mergeCursorPage(existing, incoming, args?.after);
    },
  };
}
