import { ExecutionContext } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import { getNestedValue } from "../../common/utils/getNestedValue";

/** The prefix that reads from the parent object instead of the arguments. */
const ROOT_PREFIX = "$root.";

/**
 * Resolves an id a guard was configured with, from the arguments or the parent.
 *
 * Guard configs name a dot path -- `"id"`, `"input.characterId"` -- which is
 * read off the GraphQL arguments. A `@ResolveField` has no arguments: the thing
 * it is being asked about arrives as the parent, so a guard on a field resolver
 * needs `"$root.id"` to reach it.
 *
 * `CommunityPermissionGuard` has understood that prefix for some time and the
 * other guards did not, which quietly limited which decorators could be used on
 * a field resolver at all (#310). This is that rule in one place.
 */
export function resolveGuardPath(
  context: ExecutionContext,
  path: string,
): unknown {
  const gqlContext = GqlExecutionContext.create(context);

  if (path.startsWith(ROOT_PREFIX)) {
    return getNestedValue(gqlContext.getRoot(), path.slice(ROOT_PREFIX.length));
  }

  return getNestedValue(gqlContext.getArgs(), path);
}
