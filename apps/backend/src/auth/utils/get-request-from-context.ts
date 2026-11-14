import { ExecutionContext } from "@nestjs/common";
import { GqlContextType, GqlExecutionContext } from "@nestjs/graphql";
import type { Request } from "express";

/**
 * The HTTP request behind a GraphQL resolver or a REST controller.
 *
 * Undefined for a subscription: graphql-ws builds its context from
 * connectionParams, so there is no request to find.
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
