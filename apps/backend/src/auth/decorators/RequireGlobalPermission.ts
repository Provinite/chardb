import { GlobalPermission } from "../GlobalPermission";
import { Reflector } from "@nestjs/core";

/**
 * Decorator to require a specific global permission
 *
 * @example
 * ```typescript
 * @RequireGlobalPermission(GlobalPermission.CanCreateCommunity)
 * @Mutation(() => Community)
 * async createCommunity() { ... }
 * ```
 */

export const RequireGlobalPermission =
  Reflector.createDecorator<GlobalPermission>();
