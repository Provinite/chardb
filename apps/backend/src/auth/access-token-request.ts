import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AllowAccessToken } from "./decorators/AllowAccessToken";
import { getRequestFromContext } from "./utils/get-request-from-context";

const tokenIdByRequest = new WeakMap<object, string>();

/** Called by whatever authenticated `req` with a personal access token. */
export function setRequestAccessToken(req: object, tokenId: string): void {
  tokenIdByRequest.set(req, tokenId);
}

/** The personal access token `req` was made with, if it was made with one. */
export function getRequestAccessTokenId(
  req: object | undefined | null,
): string | undefined {
  return req ? tokenIdByRequest.get(req) : undefined;
}

/**
 * Whether a gate that admits on identity alone must turn this request away.
 *
 * A token acts as its owner, so a gate that asks only who the caller is
 * (signed in, self, owner of) would let a token scoped to one community do
 * anything its owner could. Those gates admit a token request only on a
 * handler marked `@AllowAccessToken()`.
 */
export function refusesAccessToken(
  reflector: Reflector,
  context: ExecutionContext,
): boolean {
  if (!getRequestAccessTokenId(getRequestFromContext(context))) return false;
  const allowed = reflector.getAllAndOverride(AllowAccessToken, [
    context.getHandler(),
    context.getClass(),
  ]);
  return allowed !== true;
}
