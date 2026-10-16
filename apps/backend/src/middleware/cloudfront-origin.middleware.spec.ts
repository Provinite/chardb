import type { Request, Response } from "express";
import {
  cloudfrontOriginGuard,
  CLOUDFRONT_SECRET_HEADER,
} from "./cloudfront-origin.middleware";

/**
 * The prod NLB is reachable from the internet, so this guard is what keeps a
 * request that skipped CloudFront from reaching the app. The cases that matter
 * are the ones that would let such a request through.
 */
describe("cloudfrontOriginGuard", () => {
  const run = (
    secret: string | undefined,
    path: string,
    headers: Record<string, string | string[]> = {},
  ) => {
    const req = { path, headers } as unknown as Request;
    const res = {
      statusCode: 200,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      end: jest.fn(),
    };
    const next = jest.fn();
    cloudfrontOriginGuard(secret)(req, res as unknown as Response, next);
    return { passed: next.mock.calls.length === 1, status: res.statusCode };
  };

  it("passes everything when no secret is configured", () => {
    expect(run(undefined, "/graphql").passed).toBe(true);
    expect(run("", "/graphql").passed).toBe(true);
  });

  it("passes a request carrying the secret", () => {
    expect(
      run("s3cret", "/graphql", { [CLOUDFRONT_SECRET_HEADER]: "s3cret" })
        .passed,
    ).toBe(true);
  });

  it("rejects a request without the header", () => {
    expect(run("s3cret", "/graphql")).toEqual({ passed: false, status: 403 });
  });

  it("rejects a wrong secret, including a prefix and an empty one", () => {
    for (const presented of ["nope", "s3cre", "s3cret2", ""]) {
      expect(
        run("s3cret", "/graphql", { [CLOUDFRONT_SECRET_HEADER]: presented }),
      ).toEqual({ passed: false, status: 403 });
    }
  });

  it("rejects the header sent more than once", () => {
    expect(
      run("s3cret", "/graphql", {
        [CLOUDFRONT_SECRET_HEADER]: ["s3cret", "s3cret"],
      }).passed,
    ).toBe(false);
  });

  it("exempts /health and nothing under or beside it", () => {
    expect(run("s3cret", "/health").passed).toBe(true);
    expect(run("s3cret", "/health/x").passed).toBe(false);
    expect(run("s3cret", "/healthz").passed).toBe(false);
  });
});
