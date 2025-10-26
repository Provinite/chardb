import { Reflector } from "@nestjs/core";
import { SelfResolutionConfig } from "../types/SelfResolutionConfig";

/**
 * Decorator to require that the current user is accessing their own data.
 *
 * Examples:
 * - Field resolver: `@AllowSelf()` - uses parent object's id
 * - Mutation: `@AllowSelf({ userId: 'id' })` - uses argument path
 * - Nested arg: `@AllowSelf({ userId: 'input.userId' })` - uses dot notation
 *
 * Verifies: `targetUserId === currentUser.id`
 */
export const AllowSelf = Reflector.createDecorator<SelfResolutionConfig>({
  transform: (v) => {
    if (!v) {
      return {
        userId: "$root.id",
      };
    }
    return v;
  },
});
