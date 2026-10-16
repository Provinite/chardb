import { createHash, timingSafeEqual } from "crypto";
import type { Request, Response, NextFunction, RequestHandler } from "express";

export const CLOUDFRONT_SECRET_HEADER = "x-cloudfront-secret";

/**
 * Turns away any request that did not come through the API's CloudFront
 * distribution, which attaches `X-CloudFront-Secret` to everything it forwards.
 *
 * The NLB in front of the tasks is internet-facing, because CloudFront reaches
 * it as a plain custom origin. Its security group only admits CloudFront's
 * origin-facing ranges, but those ranges are shared by every CloudFront
 * distribution in AWS, so the header is what proves the request came through
 * ours.
 *
 * `/health` is exempt: the NLB's target health checks and the container's own
 * curl both call it directly, without CloudFront in the path.
 *
 * With no secret configured this is a pass-through, which is every environment
 * except prod.
 */
export function cloudfrontOriginGuard(
  secret: string | undefined,
): RequestHandler {
  if (!secret) {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }

  // Compare digests rather than the raw strings: timingSafeEqual throws on a
  // length mismatch, and hashing makes both sides the same length without
  // revealing the secret's length through an early return.
  const expected = digest(secret);

  return (req: Request, res: Response, next: NextFunction) => {
    if (req.path === "/health") {
      return next();
    }

    const presented = req.headers[CLOUDFRONT_SECRET_HEADER];
    if (
      typeof presented === "string" &&
      timingSafeEqual(digest(presented), expected)
    ) {
      return next();
    }

    res.status(403).end();
  };
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}
