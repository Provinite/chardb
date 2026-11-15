import { ConfigService } from "@nestjs/config";
import { DatabaseService } from "../../database/database.service";
import { PermissionService } from "../PermissionService";
import {
  AccessTokensUnavailableError,
  InvalidAccessTokenError,
  PersonalAccessTokensService,
} from "./personal-access-tokens.service";
import { UnknownAppEnvironmentError } from "./access-token-environment";

const serviceWith = (
  env: Record<string, string>,
  permissionService = {} as PermissionService,
) => {
  const db = {
    personalAccessToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn().mockResolvedValue({}),
    },
    community: { count: jest.fn() },
  };
  const service = new PersonalAccessTokensService(
    db as unknown as DatabaseService,
    permissionService,
    { get: (key: string) => env[key] } as unknown as ConfigService,
  );
  return { service, db };
};

/**
 * The database revokes a demoted admin's tokens as they are demoted. This is
 * the second line: a token used by an owner who is no admin is revoked then,
 * with every other token of theirs, in case the first line was ever bypassed.
 */
describe("PersonalAccessTokensService when an owner is no longer a site admin", () => {
  const live = {
    id: "token-1",
    userId: "user-1",
    revokedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
    lastUsedAt: null,
    user: { id: "user-1", isAdmin: false },
    communities: [],
  };

  it("revokes all of the owner's tokens and refuses this one", async () => {
    const { service, db } = serviceWith({ APP_ENVIRONMENT: "local" }, {
      forUser: () => ({ isAdmin: false }),
    } as unknown as PermissionService);
    db.personalAccessToken.findUnique.mockResolvedValue(live);

    await expect(
      service.authenticate("chardb_pat_local_abc"),
    ).rejects.toBeInstanceOf(InvalidAccessTokenError);
    expect(db.personalAccessToken.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("still refuses the token when revoking fails", async () => {
    const { service, db } = serviceWith({ APP_ENVIRONMENT: "local" }, {
      forUser: () => ({ isAdmin: false }),
    } as unknown as PermissionService);
    db.personalAccessToken.findUnique.mockResolvedValue(live);
    db.personalAccessToken.updateMany.mockRejectedValue(new Error("db down"));

    await expect(
      service.authenticate("chardb_pat_local_abc"),
    ).rejects.toBeInstanceOf(InvalidAccessTokenError);
  });

  it("revokes nothing for an owner who is still an admin", async () => {
    const { service, db } = serviceWith({ APP_ENVIRONMENT: "local" }, {
      forUser: () => ({ isAdmin: true }),
    } as unknown as PermissionService);
    db.personalAccessToken.findUnique.mockResolvedValue({
      ...live,
      user: { id: "user-1", isAdmin: true },
    });

    await service.authenticate("chardb_pat_local_abc");

    expect(db.personalAccessToken.updateMany).not.toHaveBeenCalled();
  });
});

/**
 * A deployed server that names no environment makes and accepts no token,
 * rather than guess one. What a token does once made is the e2e spec's.
 */
describe("PersonalAccessTokensService on a server that names no environment", () => {
  const unnamed = { NODE_ENV: "production" };

  it("makes no token", async () => {
    const { service, db } = serviceWith(unnamed);

    await expect(
      service.create("user-1", {
        name: "bot",
        expiresInDays: 30,
        communities: [{ communityId: "c-1", member: true, permissions: [] }],
      }),
    ).rejects.toThrow(AccessTokensUnavailableError);
    expect(db.personalAccessToken.create).not.toHaveBeenCalled();
  });

  it("accepts no token, without looking it up", async () => {
    const { service, db } = serviceWith(unnamed);

    await expect(
      service.authenticate("chardb_pat_prod_abc"),
    ).rejects.toBeInstanceOf(InvalidAccessTokenError);
    expect(db.personalAccessToken.findUnique).not.toHaveBeenCalled();
  });

  it("will not start with an environment it does not know", () => {
    expect(() => serviceWith({ APP_ENVIRONMENT: "staging" })).toThrow(
      UnknownAppEnvironmentError,
    );
  });
});
