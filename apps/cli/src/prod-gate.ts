import { Kind, parse } from "graphql";
import { UsageError } from "./errors";
import type { Environment } from "./target";

export type Gate = "proceed" | "prompt" | "refuse";

/**
 * Whether a request may go ahead. A change to production asks first, unless
 * `--yes` was given; with no terminal to ask on, it is refused instead.
 */
export function prodGate(input: {
  environment: Environment;
  mutation: boolean;
  yes: boolean;
  interactive: boolean;
}): Gate {
  if (!input.mutation || input.environment !== "prod" || input.yes) {
    return "proceed";
  }
  return input.interactive ? "prompt" : "refuse";
}

/**
 * Whether a document changes anything: the named operation is a mutation, or
 * with none named, any operation in it is.
 *
 * @throws UsageError for a document that does not parse.
 */
export function isMutation(query: string, operationName?: string): boolean {
  let document;
  try {
    document = parse(query);
  } catch {
    throw new UsageError("The GraphQL document does not parse");
  }
  const operations = document.definitions.filter(
    (d) => d.kind === Kind.OPERATION_DEFINITION,
  );
  const considered = operationName
    ? operations.filter((o) => o.name?.value === operationName)
    : operations;
  return considered.some((o) => o.operation === "mutation");
}
