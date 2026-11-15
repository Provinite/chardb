import type { TypedDocumentNode } from "@graphql-typed-document-node/core";
import { print } from "graphql";
import {
  ApiUnreachableError,
  type GraphqlErrorEntry,
  GraphqlRequestError,
} from "./errors";

export interface GraphqlResponse {
  data?: unknown;
  errors?: GraphqlErrorEntry[];
}

/** One API, one token. */
export class GraphqlClient {
  constructor(
    readonly url: string,
    private readonly token: string,
    private readonly fetchImpl: typeof fetch,
  ) {}

  /**
   * A typed operation's data.
   *
   * @throws GraphqlRequestError when the API answers with errors.
   * @throws ApiUnreachableError when it cannot be reached or answers with
   * something other than GraphQL.
   */
  async request<TResult, TVariables>(
    document: TypedDocumentNode<TResult, TVariables>,
    variables: TVariables,
  ): Promise<TResult> {
    const body = await this.send(print(document), variables);
    if (body.errors?.length) throw new GraphqlRequestError(body.errors);
    return body.data as TResult;
  }

  /**
   * The whole response to a document, errors included, for a caller that
   * prints it as it came.
   */
  async send(
    query: string,
    variables: unknown,
    operationName?: string,
  ): Promise<GraphqlResponse> {
    let response: Response;
    try {
      response = await this.fetchImpl(this.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ query, variables, operationName }),
      });
    } catch {
      throw new ApiUnreachableError(`Could not reach ${this.url}`, this.url);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new ApiUnreachableError(
        `${this.url} answered HTTP ${response.status}, not GraphQL`,
        this.url,
      );
    }
    if (typeof body !== "object" || body === null) {
      throw new ApiUnreachableError(
        `${this.url} answered HTTP ${response.status}, not GraphQL`,
        this.url,
      );
    }
    return body as GraphqlResponse;
  }
}
