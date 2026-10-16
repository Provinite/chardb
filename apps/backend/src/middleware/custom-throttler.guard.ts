import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
// Not re-exported from the package root in 5.x.
import type { ThrottlerLimitDetail } from "@nestjs/throttler/dist/throttler.guard.interface";
import { ExecutionContext } from "@nestjs/common";
import { GqlContextType, GqlExecutionContext } from "@nestjs/graphql";
import { GraphQLError, type GraphQLResolveInfo } from "graphql";
import type { Request, Response } from "express";

/** The `extensions.code` on a GraphQL operation refused by the rate limiter. */
export const TOO_MANY_REQUESTS = "TOO_MANY_REQUESTS";

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    // Set by .env.test. The e2e suites sign in far more often than 10 times a
    // minute from one address, and a route's @Throttle overrides whatever
    // limits a test module configures, so raising those is not enough.
    if (process.env.RATE_LIMIT_DISABLED === "true") {
      return true;
    }

    if (context.getType<GqlContextType>() === "graphql") {
      const gql = GqlExecutionContext.create(context);

      // `fieldResolverEnhancers` runs global guards on every field resolver,
      // so without this a list of 50 characters would spend 50+ hits. Only a
      // root field -- a query or mutation entry point -- counts.
      if (gql.getInfo<GraphQLResolveInfo>().path.prev !== undefined) {
        return true;
      }

      // Subscriptions over graphql-ws carry no HTTP request to key on.
      return !gql.getContext<{ req?: Request }>().req;
    }

    const request = context.switchToHttp().getRequest<Request | undefined>();

    // Handle case where request might be undefined
    if (!request) {
      return false;
    }

    // Skip throttling for OPTIONS requests (CORS preflight)
    if (request.method === "OPTIONS") {
      return true;
    }

    // Skip throttling for health check endpoints
    if (request.url?.includes("/health")) {
      return true;
    }

    // Skip throttling in development mode for static assets
    if (
      process.env.NODE_ENV === "development" &&
      (request.url?.includes(".js") ||
        request.url?.includes(".css") ||
        request.url?.includes(".map"))
    ) {
      return true;
    }

    return false;
  }

  protected getRequestResponse(context: ExecutionContext): {
    req: Request;
    res: Response;
  } {
    if (context.getType<GqlContextType>() === "graphql") {
      const { req, res } = GqlExecutionContext.create(context).getContext<{
        req: Request;
        res: Response;
      }>();
      return { req, res };
    }

    const http = context.switchToHttp();
    return { req: http.getRequest<Request>(), res: http.getResponse<Response>() };
  }

  /**
   * Over GraphQL, Apollo reports the stock ThrottlerException as
   * INTERNAL_SERVER_ERROR with "ThrottlerException: Too Many Requests" as the
   * message, which the login form would show verbatim. A code lets the client
   * tell this apart from a real failure.
   */
  protected async throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    if (context.getType<GqlContextType>() === "graphql") {
      throw new GraphQLError(
        "Too many attempts. Wait a minute and try again.",
        { extensions: { code: TOO_MANY_REQUESTS } },
      );
    }
    return super.throwThrottlingException(context, detail);
  }

  /**
   * The client's address alone. `req.ip` is the viewer's address because
   * `main.ts` trusts the one proxy hop (CloudFront) in front of the app.
   *
   * The User-Agent used to be part of the key. It protected nothing -- a
   * client picks its own User-Agent -- and while `req.ip` was the load
   * balancer's address, it lumped every Chrome-on-Windows user into a single
   * bucket.
   */
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    return typeof req.ip === "string" ? req.ip : "unknown";
  }
}
