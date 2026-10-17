import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { ExternalAccountProvider, User } from "@prisma/client";
import type { Request, Response } from "express";
import {
  DeviantArtOAuthController,
  DiscordOAuthController,
  PatreonOAuthController,
  ToyhouseOAuthController,
  OAuthLinkControllerShape,
  createOAuthLinkCallbackGuard,
} from "./oauth-link.controller";
import { PATREON } from "./oauth-link-providers";
import { ExternalAccountsService } from "../external-accounts/external-accounts.service";
import { LINK_STATE_BROWSER_MISMATCH } from "./oauth-link-state";
import { mockAuthUser } from "../../test/setup";

/**
 * The browser-binding half of account linking (#379), across every provider.
 *
 * One parameterised suite rather than a file per provider. The controllers all
 * come from one factory (`oauth-link.controller.ts`) and differ only in their
 * `oauth-link-providers.ts` config, so a provider whose config breaks the flow
 * fails here by name.
 */

const FRONTEND_URL = "http://localhost:3000";

const CONFIG: Record<string, string> = {
  JWT_SECRET: "test-jwt-secret",
  FRONTEND_URL,
  DISCORD_CLIENT_ID: "discord-client",
  DEVIANTART_CLIENT_ID: "deviantart-client",
  TOYHOUSE_CLIENT_ID: "toyhouse-client",
  PATREON_CLIENT_ID: "patreon-client",
};

const configService = {
  get: (key: string): string | undefined => CONFIG[key],
  getOrThrow: (key: string): string => {
    const value = CONFIG[key];
    if (value === undefined) throw new Error(`Missing config key ${key}`);
    return value;
  },
} as unknown as ConfigService;

type LinkController = OAuthLinkControllerShape;

interface FakeResponse {
  cookie: jest.Mock;
  clearCookie: jest.Mock;
  redirect: jest.Mock;
}

const makeRes = (): FakeResponse => ({
  cookie: jest.fn(),
  clearCookie: jest.fn(),
  redirect: jest.fn(),
});

const makeReq = (
  overrides: {
    cookies?: Record<string, string>;
    query?: Record<string, unknown>;
    user?: unknown;
  } = {},
): Request =>
  ({
    headers: {},
    cookies: overrides.cookies ?? {},
    query: overrides.query ?? {},
    user: overrides.user,
  }) as unknown as Request;

const OAUTH_PAYLOAD = {
  providerAccountId: "provider-account-1",
  displayName: "Cool User",
};

const PROVIDERS = [
  {
    name: "discord",
    segment: "discord",
    enumValue: ExternalAccountProvider.DISCORD,
    build: (
      config: ConfigService,
      jwt: JwtService,
      accounts: ExternalAccountsService,
    ): LinkController => new DiscordOAuthController(config, jwt, accounts),
  },
  {
    name: "deviantart",
    segment: "deviantart",
    enumValue: ExternalAccountProvider.DEVIANTART,
    build: (
      config: ConfigService,
      jwt: JwtService,
      accounts: ExternalAccountsService,
    ): LinkController => new DeviantArtOAuthController(config, jwt, accounts),
  },
  {
    name: "toyhouse",
    segment: "toyhouse",
    enumValue: ExternalAccountProvider.TOYHOUSE,
    build: (
      config: ConfigService,
      jwt: JwtService,
      accounts: ExternalAccountsService,
    ): LinkController => new ToyhouseOAuthController(config, jwt, accounts),
  },
  {
    name: "patreon",
    segment: "patreon",
    enumValue: ExternalAccountProvider.PATREON,
    build: (
      config: ConfigService,
      jwt: JwtService,
      accounts: ExternalAccountsService,
    ): LinkController => new PatreonOAuthController(config, jwt, accounts),
  },
];

describe.each(PROVIDERS)(
  "$name account linking",
  ({ segment, enumValue, build }) => {
    const cookieName = `chardb_oauth_link_${segment}`;
    let accounts: { linkExternalAccount: jest.Mock };
    let controller: LinkController;
    let rootDomain: string | undefined;

    beforeEach(() => {
      rootDomain = process.env.ROOT_DOMAIN;
      process.env.ROOT_DOMAIN = "localhost";
      accounts = {
        linkExternalAccount: jest
          .fn()
          .mockResolvedValue({ claimedCharacterIds: [], claimedItemIds: [] }),
      };
      controller = build(
        configService,
        new JwtService({}),
        accounts as unknown as ExternalAccountsService,
      );
    });

    afterEach(() => {
      if (rootDomain === undefined) {
        delete process.env.ROOT_DOMAIN;
      } else {
        process.env.ROOT_DOMAIN = rootDomain;
      }
    });

    /** Run the initiate route and return the state and nonce it minted. */
    const initiate = async (): Promise<{ state: string; nonce: string }> => {
      const res = makeRes();
      const { url } = await controller.initiateOAuth(
        mockAuthUser as User,
        makeReq(),
        res as unknown as Response,
      );

      const state = new URL(url).searchParams.get("state");
      expect(state).toBeTruthy();
      expect(res.cookie).toHaveBeenCalledTimes(1);
      const [name, nonce] = res.cookie.mock.calls[0] as [string, string];
      expect(name).toBe(cookieName);

      return { state: state as string, nonce };
    };

    const callback = async (
      cookies: Record<string, string>,
      state: string,
      user: unknown = OAUTH_PAYLOAD,
    ) => {
      const res = makeRes();
      await controller.handleCallback(
        makeReq({ cookies, query: { state }, user }),
        res as unknown as Response,
      );
      return res;
    };

    const redirectedTo = (res: FakeResponse): string => {
      expect(res.redirect).toHaveBeenCalledTimes(1);
      return res.redirect.mock.calls[0][0] as string;
    };

    it("sets the binding cookie when the flow is started", async () => {
      const res = makeRes();

      await controller.initiateOAuth(
        mockAuthUser as User,
        makeReq(),
        res as unknown as Response,
      );

      expect(res.cookie).toHaveBeenCalledWith(
        cookieName,
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          sameSite: "lax",
          path: `/auth/${segment}`,
        }),
      );
    });

    it("links the account when the callback comes back to the same browser", async () => {
      const { state, nonce } = await initiate();

      const res = await callback({ [cookieName]: nonce }, state);

      expect(accounts.linkExternalAccount).toHaveBeenCalledWith(
        mockAuthUser.id,
        enumValue,
        OAUTH_PAYLOAD.providerAccountId,
        OAUTH_PAYLOAD.displayName,
      );
      expect(redirectedTo(res)).toBe(
        `${FRONTEND_URL}/auth/${segment}/callback?success=true`,
      );
    });

    it("refuses a callback with no binding cookie", async () => {
      const { state } = await initiate();

      const res = await callback({}, state);

      expect(accounts.linkExternalAccount).not.toHaveBeenCalled();
      expect(redirectedTo(res)).toBe(
        `${FRONTEND_URL}/auth/${segment}/callback?error=${encodeURIComponent(
          LINK_STATE_BROWSER_MISMATCH,
        )}`,
      );
    });

    it("refuses a callback whose binding cookie belongs to another flow", async () => {
      const { state } = await initiate();
      const other = await initiate();

      const res = await callback({ [cookieName]: other.nonce }, state);

      expect(accounts.linkExternalAccount).not.toHaveBeenCalled();
      expect(redirectedTo(res)).toBe(
        `${FRONTEND_URL}/auth/${segment}/callback?error=${encodeURIComponent(
          LINK_STATE_BROWSER_MISMATCH,
        )}`,
      );
    });

    it("clears the binding cookie on the way through, so a state cannot be replayed", async () => {
      const { state, nonce } = await initiate();

      const res = await callback({ [cookieName]: nonce }, state);

      expect(res.clearCookie).toHaveBeenCalledWith(
        cookieName,
        expect.objectContaining({ path: `/auth/${segment}` }),
      );
    });

    it("sends a failed provider leg back to the frontend with its reason, spending the nonce", async () => {
      const { state, nonce } = await initiate();

      const res = await callback({ [cookieName]: nonce }, state, {
        failed: true,
        reason: "The user denied access",
      });

      expect(accounts.linkExternalAccount).not.toHaveBeenCalled();
      expect(res.clearCookie).toHaveBeenCalledWith(
        cookieName,
        expect.objectContaining({ path: `/auth/${segment}` }),
      );
      expect(redirectedTo(res)).toBe(
        `${FRONTEND_URL}/auth/${segment}/callback?error=${encodeURIComponent(
          "The user denied access",
        )}`,
      );
    });
  },
);

describe("the callback guard", () => {
  // Constructed directly: `handleRequest` reads nothing from the instance.
  const Guard = createOAuthLinkCallbackGuard(PATREON);
  const guard = new Guard() as {
    handleRequest(err: unknown, user: unknown): unknown;
  };

  it("passes an identity through", () => {
    expect(guard.handleRequest(null, OAUTH_PAYLOAD)).toEqual(OAUTH_PAYLOAD);
  });

  it("turns a passport error into a failure carrying its message", () => {
    expect(
      guard.handleRequest(new Error("Failed to obtain access token"), false),
    ).toEqual({ failed: true, reason: "Failed to obtain access token" });
  });

  it("turns a refusal with no error, such as the user clicking Deny, into a failure", () => {
    expect(guard.handleRequest(null, false)).toEqual({
      failed: true,
      reason: "Patreon did not authorize the link",
    });
  });
});
