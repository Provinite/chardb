import { ExecutionContext } from "@nestjs/common";
import { GqlContextType, GqlExecutionContext } from "@nestjs/graphql";
import type { Request } from "express";

/**
 * The request behind a GraphQL resolver or a REST controller.
 *
 * For a subscription this is not an HTTP request. Apollo's driver fills the
 * context's `req` with the graphql-ws connection context, which carries
 * `connectionParams` and lasts as long as the socket does, so whatever is
 * kept against it is kept for the connection.
 */
export function getRequestFromContext(
  context: ExecutionContext,
): Request | undefined {
  if (context.getType<GqlContextType>() === "graphql") {
    return GqlExecutionContext.create(context).getContext<{ req?: Request }>()
      ?.req;
  }
  return context.switchToHttp().getRequest<Request>();
}
