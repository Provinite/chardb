import type { TypedDocumentNode } from "@graphql-typed-document-node/core";
import { print } from "graphql";
import {
  ApiUnreachableError,
  type GraphqlErrorEntry,
  GraphqlRequestError,
  NotGraphqlError,
} from "./errors";

export interface GraphqlResponse {
  data?: unknown;
  errors?: GraphqlErrorEntry[];
}

/** Long enough for a grant of 100 items, short enough that a script moves on. */
const DEFAULT_TIMEOUT_MS = 60_000;

/** One API, one token. */
export class GraphqlClient {
  private readonly timeoutMs: number;

  constructor(
    readonly url: string,
    private readonly token: string,
    private readonly fetchImpl: typeof fetch,
    options: { timeoutMs?: number } = {},
  ) {
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /**
   * A typed operation's data.
   *
   * @throws GraphqlRequestError when the API answers with errors.
   * @throws ApiUnreachableError when it cannot be reached.
   * @throws NotGraphqlError when the answer is not a GraphQL response.
   */
  async request<TResult, TVariables>(
    document: TypedDocumentNode<TResult, TVariables>,
    variables: TVariables,
  ): Promise<TResult> {
    const { body, status } = await this.post(print(document), variables);
    if (body.errors?.length) throw new GraphqlRequestError(body.errors);
    if (body.data == null) throw new NotGraphqlError(this.url, status);
    return body.data as TResult;
  }

  /**
   * The whole response to a document, errors included, for a caller that
   * prints it as it came.
   *
   * @throws ApiUnreachableError when the API cannot be reached.
   * @throws NotGraphqlError when the answer is not a GraphQL response.
   */
  async send(
    query: string,
    variables: unknown,
    operationName?: string,
  ): Promise<GraphqlResponse> {
    return (await this.post(query, variables, operationName)).body;
  }

  private async post(
    query: string,
    variables: unknown,
    operationName?: string,
  ): Promise<{ body: GraphqlResponse; status: number }> {
    let response: Response;
    try {
      response = await this.fetchImpl(this.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ query, variables, operationName }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      throw new ApiUnreachableError(this.url, unreachableCause(err));
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new NotGraphqlError(this.url, response.status);
    }
    if (!isGraphqlResponse(body)) {
      throw new NotGraphqlError(this.url, response.status);
    }
    // A GraphQL server answers an error status only with errors to show.
    if (!response.ok && !body.errors?.length) {
      throw new NotGraphqlError(this.url, response.status);
    }
    return { body, status: response.status };
  }
}

/**
 * Why a request never got an answer: a timeout, or the system error code
 * (ECONNREFUSED, ENOTFOUND, a certificate error) fetch keeps as its cause.
 */
function unreachableCause(err: unknown): string {
  if (err instanceof Error && err.name === "TimeoutError") return "timed out";
  const cause = err instanceof Error ? err.cause : undefined;
  if (cause instanceof Error) {
    const code = (cause as NodeJS.ErrnoException).code;
    return code ?? cause.message;
  }
  return err instanceof Error ? err.message : String(err);
}

/** Carries `data` or a list of `errors`, as every GraphQL response must. */
function isGraphqlResponse(body: unknown): body is GraphqlResponse {
  if (typeof body !== "object" || body === null) return false;
  const { data, errors } = body as { data?: unknown; errors?: unknown };
  return data !== undefined || Array.isArray(errors);
}
