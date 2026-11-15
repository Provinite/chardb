import { describe, expect, it } from "vitest";
import { GraphqlClient } from "./client";
import { ApiUnreachableError } from "./errors";

describe("GraphqlClient", () => {
  it("gives up on an API that never answers", async () => {
    const hang: typeof fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(init.signal?.reason),
        );
      });
    const client = new GraphqlClient("https://api.example/graphql", "t", hang, {
      timeoutMs: 20,
    });

    const failure = await client.send("{ a }", {}).catch((err: unknown) => err);

    expect(failure).toBeInstanceOf(ApiUnreachableError);
    expect((failure as ApiUnreachableError).details.cause).toBe("timed out");
  });

  it("names why the API could not be reached", async () => {
    const refused: typeof fetch = async () => {
      throw new TypeError("fetch failed", {
        cause: Object.assign(new Error("connect ECONNREFUSED"), {
          code: "ECONNREFUSED",
        }),
      });
    };
    const client = new GraphqlClient(
      "https://api.example/graphql",
      "t",
      refused,
    );

    const failure = await client.send("{ a }", {}).catch((err: unknown) => err);

    expect((failure as ApiUnreachableError).details.cause).toBe("ECONNREFUSED");
  });
});
