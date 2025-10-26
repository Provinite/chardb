import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GqlExecutionContext } from "@nestjs/graphql";
import { AllowSelf } from "../decorators/AllowSelf";
import {
  SelfResolutionConfig,
  AllSelfResolutionKeys,
  SelfResolutionReference,
} from "../types/SelfResolutionConfig";
import { getUserFromContext } from "../utils/get-user-from-context";
import { getNestedValue } from "../../common/utils/getNestedValue";

/**
 * Guard that verifies the current user is accessing their own data.
 * Supports:
 * - Field resolvers: uses parent/root object's id
 * - Mutations/Queries: uses configured argument path
 */
@Injectable()
export class SelfGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const user = getUserFromContext(context);
    if (!user) {
      return false;
    }

    const config = this.reflector.getAllAndOverride(AllowSelf, [
      context.getHandler(),
      context.getClass(),
    ]);

    const useRootId = config && config.userId === "$root.id";

    // If no config provided, try to use root object's id
    const resolvedIds = !useRootId
      ? this.resolveUserIds(context, config)
      : this.resolveFromRoot(context);

    if (!resolvedIds.value) {
      return false;
    }

    return resolvedIds.value === user.id;
  }

  /**
   * Resolve user ID from root/parent object (for field resolvers)
   */
  private resolveFromRoot(context: ExecutionContext): SelfResolutionReference {
    try {
      const gqlContext = GqlExecutionContext.create(context);
      const parent = gqlContext.getRoot();

      if (parent?.id) {
        return { type: "root", value: parent.id };
      }

      return { type: null, value: null };
    } catch (error) {
      // Not a GraphQL context (e.g., REST endpoint), skip this guard
      return { type: null, value: null };
    }
  }

  /**
   * Resolve user ID from GraphQL arguments using config
   */
  private resolveUserIds(
    context: ExecutionContext,
    config: SelfResolutionConfig,
  ): SelfResolutionReference {
    try {
      const gqlContext = GqlExecutionContext.create(context);
      const args = gqlContext.getArgs();

      // If args is undefined, this is likely a REST endpoint
      if (!args) {
        return { type: null, value: null };
      }

      for (const key of AllSelfResolutionKeys) {
        const path = config[key];
        if (!path) continue;

        const value = getNestedValue(args, path);
        if (value) {
          return { type: key, value };
        }
      }

      return { type: null, value: null };
    } catch (error) {
      // Not a GraphQL context (e.g., REST endpoint), skip this guard
      return { type: null, value: null };
    }
  }
}
