import { createHash } from "node:crypto";
import { JwtService } from "@nestjs/jwt";
import type { CookieOptions, Request, Response } from "express";
import {
  LINK_STATE_BROWSER_MISMATCH,
  consumeLinkState,
  issueLinkState,
} from "./oauth-link-state";

const JWT_SECRET = "test-jwt-secret";
const STATE_SECRET = `${JWT_SECRET}_O`;
const FRONTEND_URL = "http://localhost:3000";
const COOKIE_NAME = "chardb_oauth_link_discord";

interface FakeResponse {
  cookie: jest.Mock;
  clearCookie: jest.Mock;
}

const makeRes = (): FakeResponse => ({
  cookie: jest.fn(),
  clearCookie: jest.fn(),
});

const makeReq = (
  overrides: {
    headers?: Record<string, string>;
    cookies?: Record<string, string>;
    query?: Record<string, unknown>;
  } = {},
): Request =>
  ({
    headers: overrides.headers ?? {},
    cookies: overrides.cookies ?? {},
    query: overrides.query ?? {},
  }) as unknown as Request;

/** The `(name, value, options)` of the one cookie a response set. */
const cookieSetBy = (
  res: FakeResponse,
): { name: string; value: string; options: CookieOptions } => {
  expect(res.cookie).toHaveBeenCalledTimes(1);
  const [name, value, options] = res.cookie.mock.calls[0] as [
    string,
    string,
    CookieOptions,
  ];
  return { name, value, options };
};

const sha256 = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

/** The JWT's claims, without verifying it -- for asserting on what we minted. */
const decodeClaims = (token: string): Record<string, unknown> =>
  JSON.parse(
    Buffer.from(token.split(".")[1], "base64url").toString("utf8"),
  ) as Record<string, unknown>;

describe("oauth-link-state", () => {
  const jwtService = new JwtService({});
  let rootDomain: string | undefined;

  beforeEach(() => {
    // `allowed-origins` reads this, and `ret` handling runs through it. Pinned
    // so the spec does not depend on whatever the surrounding environment set.
    rootDomain = process.env.ROOT_DOMAIN;
    process.env.ROOT_DOMAIN = "localhost";
  });

  afterEach(() => {
    if (rootDomain === undefined) {
      delete process.env.ROOT_DOMAIN;
    } else {
      process.env.ROOT_DOMAIN = rootDomain;
    }
  });

  /** Run a whole flow: issue a state, then hand it back with the cookie it set. */
  const roundTrip = (
    options: {
      initiateHeaders?: Record<string, string>;
      /** Defaults to the cookie the initiate step actually set. */
      callbackCookies?: Record<string, string>;
    } = {},
  ) => {
    const issueRes = makeRes();
    const state = issueLinkState({
      jwtService,
      jwtSecret: JWT_SECRET,
      provider: "discord",
      userId: "user-1",
      req: makeReq({ headers: options.initiateHeaders }),
      res: issueRes as unknown as Response,
      frontendUrl: FRONTEND_URL,
    });

    const issued = cookieSetBy(issueRes);
    const callbackRes = makeRes();
    const result = consumeLinkState({
      jwtService,
      jwtSecret: JWT_SECRET,
      provider: "discord",
      req: makeReq({
        cookies: options.callbackCookies ?? { [issued.name]: issued.value },
        query: { state },
      }),
      res: callbackRes as unknown as Response,
      frontendUrl: FRONTEND_URL,
    });

    return { state, issued, callbackRes, result };
  };

  describe("issueLinkState", () => {
    it("sets the nonce as an HttpOnly, SameSite=Lax cookie on the provider's own route", () => {
      const res = makeRes();

      issueLinkState({
        jwtService,
        jwtSecret: JWT_SECRET,
        provider: "discord",
        userId: "user-1",
        req: makeReq(),
        res: res as unknown as Response,
        frontendUrl: FRONTEND_URL,
      });

      const { name, value, options } = cookieSetBy(res);
      expect(name).toBe(COOKIE_NAME);
      expect(value.length).toBeGreaterThan(0);
      expect(options).toMatchObject({
        httpOnly: true,
        sameSite: "lax",
        path: "/auth/discord",
        maxAge: 10 * 60 * 1000,
      });
      // Host-only: the API host is the only one that needs it, unlike the
      // session cookie which has to reach every community subdomain.
      expect(options.domain).toBeUndefined();
    });

    it("marks the cookie Secure in production", () => {
      const previous = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      const res = makeRes();

      try {
        issueLinkState({
          jwtService,
          jwtSecret: JWT_SECRET,
          provider: "discord",
          userId: "user-1",
          req: makeReq(),
          res: res as unknown as Response,
          frontendUrl: FRONTEND_URL,
        });
      } finally {
        process.env.NODE_ENV = previous;
      }

      expect(cookieSetBy(res).options.secure).toBe(true);
    });

    it("names the cookie per provider, so two pending flows cannot clobber each other", () => {
      const res = makeRes();

      issueLinkState({
        jwtService,
        jwtSecret: JWT_SECRET,
        provider: "toyhouse",
        userId: "user-1",
        req: makeReq(),
        res: res as unknown as Response,
        frontendUrl: FRONTEND_URL,
      });

      expect(cookieSetBy(res)).toMatchObject({
        name: "chardb_oauth_link_toyhouse",
        options: { path: "/auth/toyhouse" },
      });
    });

    it("puts only the hash of the nonce in the state token", () => {
      const res = makeRes();

      const state = issueLinkState({
        jwtService,
        jwtSecret: JWT_SECRET,
        provider: "discord",
        userId: "user-1",
        req: makeReq(),
        res: res as unknown as Response,
        frontendUrl: FRONTEND_URL,
      });

      const nonce = cookieSetBy(res).value;
      // The token reaches the provider, its logs and the URL bar; the nonce
      // must not be recoverable from any of them.
      expect(state).not.toContain(nonce);
      expect(decodeClaims(state)).toMatchObject({
        sub: "user-1",
        bnd: sha256(nonce),
      });
    });
  });

  describe("consumeLinkState", () => {
    it("accepts a callback from the browser that started the flow", () => {
      expect(roundTrip().result).toEqual({
        ok: true,
        userId: "user-1",
        returnBase: FRONTEND_URL,
      });
    });

    it("rejects a callback that presents no cookie", () => {
      expect(roundTrip({ callbackCookies: {} }).result).toEqual({
        ok: false,
        returnBase: FRONTEND_URL,
        error: LINK_STATE_BROWSER_MISMATCH,
      });
    });

    it("rejects a callback whose cookie does not match the state", () => {
      const { result } = roundTrip({
        callbackCookies: { [COOKIE_NAME]: "a-nonce-from-somewhere-else" },
      });

      expect(result).toEqual({
        ok: false,
        returnBase: FRONTEND_URL,
        error: LINK_STATE_BROWSER_MISMATCH,
      });
    });

    it("spends the nonce on a successful callback", () => {
      const { callbackRes } = roundTrip();

      expect(callbackRes.clearCookie).toHaveBeenCalledWith(
        COOKIE_NAME,
        expect.objectContaining({ path: "/auth/discord", httpOnly: true }),
      );
    });

    it("spends the nonce on a rejected callback too, so it cannot be retried", () => {
      const { callbackRes } = roundTrip({
        callbackCookies: { [COOKIE_NAME]: "wrong" },
      });

      expect(callbackRes.clearCookie).toHaveBeenCalledWith(
        COOKIE_NAME,
        expect.objectContaining({ path: "/auth/discord" }),
      );
    });

    it("rejects a missing state parameter", () => {
      const res = makeRes();

      expect(
        consumeLinkState({
          jwtService,
          jwtSecret: JWT_SECRET,
          provider: "discord",
          req: makeReq({ cookies: { [COOKIE_NAME]: "anything" } }),
          res: res as unknown as Response,
          frontendUrl: FRONTEND_URL,
        }),
      ).toEqual({
        ok: false,
        returnBase: FRONTEND_URL,
        error: "Missing state parameter",
      });
    });

    it("rejects a state signed with a different secret", () => {
      const nonce = "the-real-nonce";
      const forged = jwtService.sign(
        { sub: "user-1", bnd: sha256(nonce) },
        { secret: "not-our-secret", expiresIn: "10m" },
      );
      const res = makeRes();

      expect(
        consumeLinkState({
          jwtService,
          jwtSecret: JWT_SECRET,
          provider: "discord",
          req: makeReq({
            cookies: { [COOKIE_NAME]: nonce },
            query: { state: forged },
          }),
          res: res as unknown as Response,
          frontendUrl: FRONTEND_URL,
        }),
      ).toEqual({
        ok: false,
        returnBase: FRONTEND_URL,
        error: "Invalid or expired state token",
      });
    });

    it("rejects an expired state even with the matching cookie", () => {
      const nonce = "the-real-nonce";
      const expired = jwtService.sign(
        { sub: "user-1", bnd: sha256(nonce) },
        { secret: STATE_SECRET, expiresIn: "-1s" },
      );
      const res = makeRes();

      expect(
        consumeLinkState({
          jwtService,
          jwtSecret: JWT_SECRET,
          provider: "discord",
          req: makeReq({
            cookies: { [COOKIE_NAME]: nonce },
            query: { state: expired },
          }),
          res: res as unknown as Response,
          frontendUrl: FRONTEND_URL,
        }),
      ).toEqual({
        ok: false,
        returnBase: FRONTEND_URL,
        error: "Invalid or expired state token",
      });
    });

    it("rejects a state carrying no binding at all, as one minted before #379 would", () => {
      const legacy = jwtService.sign(
        { sub: "user-1" },
        { secret: STATE_SECRET, expiresIn: "10m" },
      );
      const res = makeRes();

      expect(
        consumeLinkState({
          jwtService,
          jwtSecret: JWT_SECRET,
          provider: "discord",
          req: makeReq({
            cookies: { [COOKIE_NAME]: "anything" },
            query: { state: legacy },
          }),
          res: res as unknown as Response,
          frontendUrl: FRONTEND_URL,
        }),
      ).toEqual({
        ok: false,
        returnBase: FRONTEND_URL,
        error: LINK_STATE_BROWSER_MISMATCH,
      });
    });

    it("returns the user to the community they started from", () => {
      const { result } = roundTrip({
        initiateHeaders: { origin: "http://willowmere.localhost:3000" },
      });

      expect(result).toMatchObject({
        ok: true,
        returnBase: "http://willowmere.localhost:3000",
      });
    });

    it("returns a rejected flow to that community as well, rather than the apex", () => {
      const { result } = roundTrip({
        initiateHeaders: { origin: "http://willowmere.localhost:3000" },
        callbackCookies: {},
      });

      expect(result).toEqual({
        ok: false,
        returnBase: "http://willowmere.localhost:3000",
        error: LINK_STATE_BROWSER_MISMATCH,
      });
    });

    it("ignores an origin that is not on the allowlist", () => {
      const { result } = roundTrip({
        initiateHeaders: { origin: "https://evil.example" },
      });

      expect(result).toMatchObject({ ok: true, returnBase: FRONTEND_URL });
    });
  });
});
