import { Reflector } from "@nestjs/core";
import { ExecutionContextHost } from "@nestjs/core/helpers/execution-context-host";
import { ThrottlerStorageService } from "@nestjs/throttler";
import type { OperationTypeNode } from "graphql";
import { CustomThrottlerGuard } from "./custom-throttler.guard";

class TestResolver {
  field(): void {}
}

/**
 * A root-field GraphQL execution context the way Nest builds one: resolver
 * args `[root, args, context, info]`.
 */
function gqlContext(
  operation: `${OperationTypeNode}`,
  context: Record<string, unknown>,
): ExecutionContextHost {
  const info = {
    operation: { operation },
    path: { prev: undefined, key: "field", typename: "Root" },
  };
  const host = new ExecutionContextHost(
    [{}, {}, context, info],
    TestResolver,
    TestResolver.prototype.field,
  );
  host.setType("graphql");
  return host;
}

describe("CustomThrottlerGuard", () => {
  const previous = process.env.RATE_LIMIT_DISABLED;
  let storage: ThrottlerStorageService;
  let guard: CustomThrottlerGuard;

  beforeEach(async () => {
    delete process.env.RATE_LIMIT_DISABLED;
    storage = new ThrottlerStorageService();
    guard = new CustomThrottlerGuard(
      [{ ttl: 60_000, limit: 10 }],
      storage,
      new Reflector(),
    );
    await guard.onModuleInit();
  });

  afterEach(() => {
    storage.onApplicationShutdown();
  });

  afterAll(() => {
    if (previous === undefined) {
      delete process.env.RATE_LIMIT_DISABLED;
    } else {
      process.env.RATE_LIMIT_DISABLED = previous;
    }
  });

  // graphql-ws hands the context the upgrade request but no response.
  it("lets a subscription through without counting it", async () => {
    const context = gqlContext("subscription", { req: { ip: "203.0.113.1" } });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(storage.storage).toEqual({});
  });

  it.each(["query", "mutation"] as const)(
    "counts a %s root field against the client's address",
    async (operation) => {
      const res = { header: jest.fn() };
      const context = gqlContext(operation, {
        req: { ip: "203.0.113.1" },
        res,
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(Object.values(storage.storage)).toEqual([
        expect.objectContaining({ totalHits: 1 }),
      ]);
      expect(res.header).toHaveBeenCalledWith("X-RateLimit-Limit", 10);
    },
  );
});
