import { CFG } from "../config.js";
import type { Actor, Persona } from "./types.js";

class GraphQLRequestError extends Error {
  constructor(
    readonly actorKey: string,
    readonly errors: Array<{ message: string }>,
    query: string,
  ) {
    const op = /(?:mutation|query)\s+(\w+)/.exec(query)?.[1] ?? "anonymous";
    super(
      `GraphQL ${op} failed as "${actorKey}": ` +
        errors.map((e) => e.message).join("; "),
    );
    this.name = "GraphQLRequestError";
  }
}

export function makeActor(key: string, persona: Persona | null): Actor {
  const authHeader = (): Record<string, string> =>
    persona ? { authorization: `Bearer ${persona.accessToken}` } : {};

  return {
    key,
    persona,

    async gql<T>(query: string, variables: Record<string, unknown> = {}) {
      const res = await fetch(CFG.graphqlUrl, {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeader() },
        body: JSON.stringify({ query, variables }),
      });
      const body = (await res.json()) as {
        data?: T;
        errors?: Array<{ message: string }>;
      };
      if (body.errors?.length) {
        throw new GraphQLRequestError(key, body.errors, query);
      }
      if (!res.ok) {
        throw new Error(`GraphQL HTTP ${res.status} as "${key}"`);
      }
      return body.data as T;
    },

    async rest(path: string, init: RequestInit = {}) {
      return fetch(`${CFG.backendUrl}${path}`, {
        ...init,
        headers: { ...(init.headers ?? {}), ...authHeader() },
      });
    },
  };
}
