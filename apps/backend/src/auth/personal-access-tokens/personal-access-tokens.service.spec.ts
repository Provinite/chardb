import { ConfigService } from "@nestjs/config";
import { DatabaseService } from "../../database/database.service";
import { PermissionService } from "../PermissionService";
import {
  AccessTokensUnavailableError,
  InvalidAccessTokenError,
  PersonalAccessTokensService,
} from "./personal-access-tokens.service";
import { UnknownAppEnvironmentError } from "./access-token-environment";

const serviceWith = (env: Record<string, string>) => {
  const db = {
    personalAccessToken: { findUnique: jest.fn(), create: jest.fn() },
    community: { count: jest.fn() },
  };
  const service = new PersonalAccessTokensService(
    db as unknown as DatabaseService,
    {} as PermissionService,
    { get: (key: string) => env[key] } as unknown as ConfigService,
  );
  return { service, db };
};

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
