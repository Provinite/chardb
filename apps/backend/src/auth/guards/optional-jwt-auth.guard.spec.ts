import { ExecutionContext } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { JwtStrategy } from "../strategies/jwt.strategy";
import { UsersService } from "../../users/users.service";
import {
  MissingPermissionServiceError,
  OptionalJwtAuthGuard,
} from "./optional-jwt-auth.guard";
import { PermissionService } from "../PermissionService";
import {
  ANONYMOUS_PERMISSIONS,
  getRequestPermissions,
  RequestPermissions,
} from "../request-permissions";
import { getRequestAccessTokenId } from "../access-token-request";
import {
  InvalidAccessTokenError,
  PersonalAccessTokensService,
} from "../personal-access-tokens/personal-access-tokens.service";

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
  const viewerPermissions = { isAdmin: true } as RequestPermissions;
  let findById: jest.Mock;
  let forUser: jest.Mock;
  let forAccessToken: jest.Mock;
  let authenticateAccessToken: jest.Mock;
  let guard: OptionalJwtAuthGuard;
  const tokenPermissions = { isAdmin: false } as RequestPermissions;
  const grants = [{ communityId: "c-1", permissions: ["canManageItems"] }];

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
    forUser = jest.fn((user: unknown) =>
      user ? viewerPermissions : ANONYMOUS_PERMISSIONS,
    );
    forAccessToken = jest.fn(() => tokenPermissions);
    authenticateAccessToken = jest.fn().mockResolvedValue({
      tokenId: "token-1",
      user: viewer,
      grants,
    });
    guard = new OptionalJwtAuthGuard(
      { forUser, forAccessToken } as unknown as PermissionService,
      {
        authenticate: authenticateAccessToken,
      } as unknown as PersonalAccessTokensService,
    );
  });

  // AuthGuard marks its own first constructor argument optional, and this
  // class inherits the mark: Nest injects undefined where it cannot find a
  // PermissionService rather than refusing to start.
  it("cannot be built without a PermissionService", () => {
    expect(
      () =>
        new OptionalJwtAuthGuard(
          undefined as unknown as PermissionService,
          {} as PersonalAccessTokensService,
        ),
    ).toThrow(MissingPermissionServiceError);
  });

  it("gives the request its viewer's permissions", async () => {
    const req = signedInRequest();

    await guard.canActivate(graphqlContextFor(req));
    await guard.canActivate(graphqlContextFor(req));

    expect(forUser).toHaveBeenCalledTimes(1);
    expect(forUser).toHaveBeenCalledWith(viewer);
    expect(getRequestPermissions(req)).toBe(viewerPermissions);
  });

  it("gives an anonymous request no permissions", async () => {
    const req: FakeRequest = { headers: {} };

    await guard.canActivate(graphqlContextFor(req));

    expect(getRequestPermissions(req)).toBe(ANONYMOUS_PERMISSIONS);
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

  it("treats a context with no request as anonymous", async () => {
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

  describe("with a personal access token", () => {
    const tokenRequest = (): FakeRequest => ({
      headers: { authorization: "Bearer chardb_pat_secret" },
    });

    it("acts as the token's owner with the token's permissions", async () => {
      const req = tokenRequest();

      await expect(guard.canActivate(graphqlContextFor(req))).resolves.toBe(
        true,
      );

      expect(authenticateAccessToken).toHaveBeenCalledWith("chardb_pat_secret");
      expect(req.user).toBe(viewer);
      expect(forAccessToken).toHaveBeenCalledWith(grants);
      expect(forUser).not.toHaveBeenCalled();
      expect(getRequestPermissions(req)).toBe(tokenPermissions);
      expect(getRequestAccessTokenId(req)).toBe("token-1");
    });

    it("does not try the token as a session", async () => {
      await guard.canActivate(graphqlContextFor(tokenRequest()));

      expect(findById).not.toHaveBeenCalled();
    });

    it("authenticates the token once however many fields resolve", async () => {
      const req = tokenRequest();

      await Promise.all([
        guard.canActivate(graphqlContextFor(req)),
        guard.canActivate(graphqlContextFor(req)),
      ]);

      expect(authenticateAccessToken).toHaveBeenCalledTimes(1);
    });

    it("refuses a token the service refuses, rather than going on anonymous", async () => {
      authenticateAccessToken.mockRejectedValue(new InvalidAccessTokenError());
      const req = tokenRequest();

      await expect(guard.canActivate(graphqlContextFor(req))).rejects.toThrow(
        InvalidAccessTokenError,
      );
      expect(req.user).toBeUndefined();
    });

    it("reads a subscription's token from its connection parameters", async () => {
      const req = {
        connectionParams: { authorization: "Bearer chardb_pat_secret" },
      } as unknown as FakeRequest;

      await guard.canActivate(graphqlContextFor(req));

      expect(authenticateAccessToken).toHaveBeenCalledWith("chardb_pat_secret");
      expect(getRequestPermissions(req)).toBe(tokenPermissions);
    });
  });
});
