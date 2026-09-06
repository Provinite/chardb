import { isOriginAllowed } from "./allowed-origins";

/**
 * This predicate is the only thing standing between a session cookie on
 * `.chardb.cc` and any site that asks for it. It replaced `origin: true`, which
 * reflected whatever the caller claimed -- survivable while the session was a
 * bearer header no browser sends on its own, and a credential leak the moment
 * a cookie existed.
 *
 * So the cases that matter here are the near misses, not the obvious ones.
 */
describe("isOriginAllowed", () => {
  const withRootDomain = (root: string, run: () => void) => {
    const previous = process.env.ROOT_DOMAIN;
    process.env.ROOT_DOMAIN = root;
    try {
      run();
    } finally {
      process.env.ROOT_DOMAIN = previous;
    }
  };

  it("allows the apex and any single community subdomain", () => {
    withRootDomain("chardb.cc", () => {
      expect(isOriginAllowed("https://chardb.cc")).toBe(true);
      expect(isOriginAllowed("https://willowmere.chardb.cc")).toBe(true);
      expect(isOriginAllowed("https://api.chardb.cc")).toBe(true);
    });
  });

  it("refuses a domain that merely ends with the root domain's text", () => {
    // The failure mode a naive `endsWith` or `includes` check would have.
    withRootDomain("chardb.cc", () => {
      expect(isOriginAllowed("https://chardb.cc.evil.example")).toBe(false);
      expect(isOriginAllowed("https://notchardb.cc")).toBe(false);
      expect(isOriginAllowed("https://evil.example/?x=.chardb.cc")).toBe(false);
    });
  });

  it("refuses more than one label under the root domain", () => {
    // A community is exactly one label. `a.b.chardb.cc` is not one, and
    // allowing it would widen the cookie's reach past what was intended.
    withRootDomain("chardb.cc", () => {
      expect(isOriginAllowed("https://a.b.chardb.cc")).toBe(false);
    });
  });

  it("refuses the staging label, which is under production's root", () => {
    // Staging is `dev.chardb.cc`, one label under production, so it satisfies
    // the single-label rule. Accepting it as a CREDENTIALED origin would let
    // script on staging call the production API with the browser's production
    // cookie and read the reply.
    withRootDomain("chardb.cc", () => {
      expect(isOriginAllowed("https://dev.chardb.cc")).toBe(false);
      expect(isOriginAllowed("https://staging.chardb.cc")).toBe(false);
    });
  });

  it("still allows staging its own apex when it is the root", () => {
    // On staging itself ROOT_DOMAIN is `dev.chardb.cc`, so its own origin is
    // the root rather than a label under one, and the blocklist never applies.
    withRootDomain("dev.chardb.cc", () => {
      expect(isOriginAllowed("https://dev.chardb.cc")).toBe(true);
      expect(isOriginAllowed("https://willowmere.dev.chardb.cc")).toBe(true);
    });
  });

  it("refuses non-http schemes", () => {
    withRootDomain("chardb.cc", () => {
      expect(isOriginAllowed("ftp://chardb.cc")).toBe(false);
      expect(isOriginAllowed("file://chardb.cc")).toBe(false);
      expect(isOriginAllowed("javascript:alert(1)")).toBe(false);
    });
  });

  it("refuses anything that is not a URL", () => {
    withRootDomain("chardb.cc", () => {
      expect(isOriginAllowed("null")).toBe(false);
      expect(isOriginAllowed("")).toBe(false);
      expect(isOriginAllowed("chardb.cc")).toBe(false);
    });
  });

  it("keeps the port out of the decision, so local development works", () => {
    withRootDomain("localhost", () => {
      expect(isOriginAllowed("http://localhost:20600")).toBe(true);
      expect(isOriginAllowed("http://willowmere.localhost:20600")).toBe(true);
      expect(isOriginAllowed("http://evil.example:20600")).toBe(false);
    });
  });

  it("honours ADDITIONAL_CORS_ORIGINS exactly", () => {
    const previous = process.env.ADDITIONAL_CORS_ORIGINS;
    process.env.ADDITIONAL_CORS_ORIGINS =
      "https://d111.cloudfront.net, https://preview.example";
    try {
      withRootDomain("chardb.cc", () => {
        expect(isOriginAllowed("https://d111.cloudfront.net")).toBe(true);
        expect(isOriginAllowed("https://preview.example")).toBe(true);
        // Exact origins, not suffixes: a subdomain of an extra is not implied.
        expect(isOriginAllowed("https://x.d111.cloudfront.net")).toBe(false);
      });
    } finally {
      process.env.ADDITIONAL_CORS_ORIGINS = previous;
    }
  });
});
