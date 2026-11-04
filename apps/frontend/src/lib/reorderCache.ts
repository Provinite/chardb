import type { ApolloCache, Reference, StoreObject } from "@apollo/client";

type Readable = Reference | StoreObject;
type ReadField = (field: string, from: Readable) => unknown;

const byPosition =
  (field: string, readField: ReadField) => (a: Readable, b: Readable) =>
    Number(readField(field, a) ?? 0) - Number(readField(field, b) ?? 0);

/**
 * Re-sorts every cached page of a root connection field (`{ nodes }`) by a
 * position field, after a reorder has written the new positions.
 *
 * A reorder response only updates each row's position, so a list cached by
 * another screen would keep its old order until refetched. Every cached copy
 * is sorted, whatever its arguments: each is one species' or one trait's list,
 * already in order, so sorting it again changes only the lists the reorder
 * touched.
 */
export const sortCachedConnection = (
  cache: ApolloCache<unknown>,
  fieldName: string,
  positionField: string,
) => {
  cache.modify({
    fields: {
      [fieldName](existing: unknown, { readField }) {
        if (
          typeof existing !== "object" ||
          existing === null ||
          !("nodes" in existing) ||
          !Array.isArray(existing.nodes)
        ) {
          return existing;
        }
        const nodes = existing.nodes as Readable[];
        return {
          ...existing,
          nodes: [...nodes].sort(byPosition(positionField, readField)),
        };
      },
    },
  });
};

/** Re-sorts one cached object's list field (`Trait.enumValues`) by position. */
export const sortCachedListField = (
  cache: ApolloCache<unknown>,
  id: string | undefined,
  fieldName: string,
  positionField: string,
) => {
  if (!id) return;
  cache.modify({
    id,
    fields: {
      [fieldName](existing: unknown, { readField }) {
        if (!Array.isArray(existing)) return existing;
        return [...(existing as Readable[])].sort(
          byPosition(positionField, readField),
        );
      },
    },
  });
};
