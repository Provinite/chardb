import { print, type DocumentNode } from "graphql";
import type { TypedDocumentNode } from "@graphql-typed-document-node/core";
import { CFG } from "../config.js";
import type { Actor, Persona } from "./types.js";

class GraphQLRequestError extends Error {
  constructor(
    readonly actorKey: string,
    readonly operation: string,
    readonly errors: Array<{ message: string }>,
  ) {
    super(
      `GraphQL ${operation} failed as "${actorKey}": ` +
        errors.map((e) => e.message).join("; "),
    );
    this.name = "GraphQLRequestError";
  }
}

// Takes the plain DocumentNode: TypedDocumentNode is invariant in its type
// parameters, so a <unknown, unknown> annotation would not accept a concrete one.
const operationName = (document: DocumentNode): string => {
  for (const definition of document.definitions) {
    if (definition.kind === "OperationDefinition" && definition.name) {
      return definition.name.value;
    }
  }
  return "anonymous";
};

export function makeActor(key: string, persona: Persona | null): Actor {
  const authHeader = (): Record<string, string> =>
    persona ? { authorization: `Bearer ${persona.accessToken}` } : {};

  return {
    key,
    persona,

    /**
     * Takes a generated TypedDocumentNode, so both the result and the variables
     * are inferred from the schema -- no hand-written response shapes to drift.
     */
    async gql<TResult, TVariables>(
      document: TypedDocumentNode<TResult, TVariables>,
      variables?: TVariables,
    ): Promise<TResult> {
      const res = await fetch(CFG.graphqlUrl, {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeader() },
        body: JSON.stringify({
          query: print(document),
          variables: variables ?? {},
        }),
      });
      const body = (await res.json()) as {
        data?: TResult;
        errors?: Array<{ message: string }>;
      };
      if (body.errors?.length) {
        throw new GraphQLRequestError(
          key,
          operationName(document),
          body.errors,
        );
      }
      if (!res.ok) {
        throw new Error(
          `GraphQL HTTP ${res.status} for ${operationName(document)} as "${key}"`,
        );
      }
      return body.data as TResult;
    },

    async rest(path: string, init: RequestInit = {}) {
      return fetch(`${CFG.backendUrl}${path}`, {
        ...init,
        headers: { ...(init.headers ?? {}), ...authHeader() },
      });
    },
  };
}
