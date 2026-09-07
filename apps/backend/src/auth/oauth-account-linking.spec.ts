import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { ExternalAccountProvider, User } from "@prisma/client";
import type { Request, Response } from "express";
import { DeviantArtOAuthController } from "./deviantart-oauth.controller";
import { DiscordOAuthController } from "./discord-oauth.controller";
import { ToyhouseOAuthController } from "./toyhouse-oauth.controller";
import { ExternalAccountsService } from "../external-accounts/external-accounts.service";
import { LINK_STATE_BROWSER_MISMATCH } from "./oauth-link-state";
import { mockAuthUser } from "../../test/setup";

/**
 * The browser-binding half of account linking (#379), across all three
 * providers.
 *
 * One parameterised suite rather than three files because the three
 * controllers are identical in this area -- they differ only in the provider
 * enum, the route segment and the authorize URL they build. Anything that
 * drifts between them fails here for the provider that drifted.
 */

const FRONTEND_URL = "http://localhost:3000";

const CONFIG: Record<string, string> = {
  JWT_SECRET: "test-jwt-secret",
  FRONTEND_URL,
  DISCORD_CLIENT_ID: "discord-client",
  DEVIANTART_CLIENT_ID: "deviantart-client",
  TOYHOUSE_CLIENT_ID: "toyhouse-client",
};

const configService = {
  get: (key: string): string | undefined => CONFIG[key],
  getOrThrow: (key: string): string => {
    const value = CONFIG[key];
    if (value === undefined) throw new Error(`Missing config key ${key}`);
    return value;
  },
} as unknown as ConfigService;

/** The shape the three controllers share; enough to drive both routes. */
interface LinkController {
  initiateOAuth(
    user: User,
    req: Request,
    res: Response,
  ): Promise<{ url: string }>;
  handleCallback(req: Request, res: Response): Promise<void>;
}

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

    const callback = async (cookies: Record<string, string>, state: string) => {
      const res = makeRes();
      await controller.handleCallback(
        makeReq({ cookies, query: { state }, user: OAUTH_PAYLOAD }),
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
  },
);
