import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GqlContextType, GqlExecutionContext } from "@nestjs/graphql";
import type { Request } from "express";
import { AllowUnauthenticated } from "../decorators/AllowUnauthenticated";
import { refusesAccessToken } from "../access-token-request";

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

@Injectable()
export class UnauthenticatedGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride(AllowUnauthenticated, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic !== true) return false;

    // The public writes are sign-in, sign-up, password reset and the like.
    // None is a token's business, so a token request may read what anyone
    // may read and write nothing here.
    if (isWrite(context) && refusesAccessToken(this.reflector, context)) {
      return false;
    }
    return true;
  }
}

/**
 * A mutation's own resolver, or a REST route that is not a read. The fields
 * of a mutation's result are reads, and are not.
 */
function isWrite(context: ExecutionContext): boolean {
  if (context.getType<GqlContextType>() === "graphql") {
    return (
      GqlExecutionContext.create(context).getInfo()?.parentType?.name ===
      "Mutation"
    );
  }
  if (context.getType() === "http") {
    const method = context.switchToHttp().getRequest<Request>()?.method;
    return !READ_METHODS.has(method?.toUpperCase() ?? "GET");
  }
  return false;
}
