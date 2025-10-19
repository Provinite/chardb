import { GlobalPermission } from '../GlobalPermission';
import { Reflector } from '@nestjs/core';

/**
 * Decorator to require a specific global permission
 *
 * @example
 * ```typescript
 * @AllowGlobalPermission(GlobalPermission.CanCreateCommunity)
 * @Mutation(() => Community)
 * async createCommunity() { ... }
 * ```
 */

export const AllowGlobalPermission =
  Reflector.createDecorator<GlobalPermission>();
