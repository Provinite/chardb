import { Reflector } from "@nestjs/core";
import { SelfResolutionConfig } from "../types/SelfResolutionConfig";

/**
 * Decorator to require that the current user is accessing their own data.
 *
 * Examples:
 * - Field resolver: `@RequireSelf()` - uses parent object's id
 * - Mutation: `@RequireSelf({ userId: 'id' })` - uses argument path
 * - Nested arg: `@RequireSelf({ userId: 'input.userId' })` - uses dot notation
 *
 * Verifies: `targetUserId === currentUser.id`
 */
export const RequireSelf = Reflector.createDecorator<SelfResolutionConfig>();
