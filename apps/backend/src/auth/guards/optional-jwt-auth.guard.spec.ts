import { ExecutionContext } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { JwtStrategy } from "../strategies/jwt.strategy";
import { UsersService } from "../../users/users.service";
import { OptionalJwtAuthGuard } from "./optional-jwt-auth.guard";

const SECRET = "optional-jwt-auth-guard-spec";

interface FakeRequest {
  headers: Record<string, string>;
  user?: unknown;
}

/** The context a field resolver's guard sees: [root, args, context, info]. */
const graphqlContextFor = (req: FakeRequest | undefined): ExecutionContext => {
  const args = [{}, {}, { req }, {}];
  return {
    getType: () => "graphql",
    getArgs: () => args,
    getArgByIndex: (index: number) => args[index],
    getClass: () => Object,
    getHandler: () => () => undefined,
    switchToHttp: () => ({
      getRequest: () => args[0],
      getResponse: () => args[1],
      getNext: () => undefined,
    }),
  } as unknown as ExecutionContext;
};

/**
 * Global guards run once per field resolver, not once per request, so a
 * list of fifty characters would otherwise verify the token and look the
 * viewer up fifty times over.
 */
describe("OptionalJwtAuthGuard", () => {
  const viewer = { id: "user-1", username: "viewer" };
  let findById: jest.Mock;
  let guard: OptionalJwtAuthGuard;

  const signedInRequest = (): FakeRequest => ({
    headers: {
      authorization: `Bearer ${new JwtService({ secret: SECRET }).sign({ sub: viewer.id })}`,
    },
  });

  beforeEach(() => {
    findById = jest.fn().mockResolvedValue(viewer);
    new JwtStrategy(
      { get: () => SECRET } as unknown as ConfigService,
      { findById } as unknown as UsersService,
    );
    guard = new OptionalJwtAuthGuard();
  });

  it("looks the viewer up once however many fields resolve", async () => {
    const req = signedInRequest();

    await guard.canActivate(graphqlContextFor(req));
    await guard.canActivate(graphqlContextFor(req));
    await guard.canActivate(graphqlContextFor(req));

    expect(findById).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual(viewer);
  });

  it("looks the viewer up once when fields resolve concurrently", async () => {
    const req = signedInRequest();

    await Promise.all([
      guard.canActivate(graphqlContextFor(req)),
      guard.canActivate(graphqlContextFor(req)),
      guard.canActivate(graphqlContextFor(req)),
    ]);

    expect(findById).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual(viewer);
  });

  it("authenticates an anonymous request once", async () => {
    const req: FakeRequest = { headers: {} };
    const handleRequest = jest.spyOn(guard, "handleRequest");

    await guard.canActivate(graphqlContextFor(req));
    await guard.canActivate(graphqlContextFor(req));

    expect(handleRequest).toHaveBeenCalledTimes(1);
    expect(req.user).toBeNull();
  });

  /** graphql-ws builds the context from connectionParams, so there is no req. */
  it("treats a subscription as anonymous", async () => {
    const unhandled = jest.fn();
    process.on("unhandledRejection", unhandled);

    await expect(guard.canActivate(graphqlContextFor(undefined))).resolves.toBe(
      true,
    );
    await new Promise((resolve) => setImmediate(resolve));

    process.off("unhandledRejection", unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });

  it("authenticates each request separately", async () => {
    await guard.canActivate(graphqlContextFor(signedInRequest()));
    await guard.canActivate(graphqlContextFor(signedInRequest()));

    expect(findById).toHaveBeenCalledTimes(2);
  });
});
