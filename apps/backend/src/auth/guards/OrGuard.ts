import {
  CanActivate,
  ExecutionContext,
  Injectable,
  mixin,
  Type,
} from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";

/**
 * Creates a guard that passes if ANY of the provided guards passes (OR logic).
 *
 * This function uses NestJS's mixin pattern to create a dynamic guard class
 * that evaluates multiple guards with OR logic. Guards are retrieved from the
 * DI container, so they can have dependencies injected automatically.
 *
 * The guards are checked in order, and the first one that passes will allow access.
 * If a guard throws an error, it's caught and the next guard is tried.
 * Only if all guards fail does the request get rejected.
 *
 * @param guards - Array of guard classes to check
 * @returns A dynamically created guard class that implements OR logic
 *
 * The app registers one of these globally, as `PERMISSION_OR_GUARD` in
 * `auth.module.ts`, over every permission guard. Each of those passes only
 * for a handler carrying its own `@Allow*` decorator, so a resolver states
 * who may call it with decorators and needs no `@UseGuards`:
 *
 * @example
 * ```typescript
 * // The character's community lets them edit it, OR they are a site admin
 * @AllowGlobalAdmin()
 * @AllowCommunityPermission(CommunityPermission.CanEditCharacter)
 * @ResolveCommunityFrom({ characterId: 'id' })
 * @Mutation(() => Character)
 * async updateCharacter(@Args('id') id: string) {}
 * ```
 */
export function OrGuard(...guards: Type<CanActivate>[]): Type<CanActivate> {
  @Injectable()
  class OrGuardMixin implements CanActivate {
    constructor(private moduleRef: ModuleRef) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
      const errors: Error[] = [];

      for (const GuardClass of guards) {
        try {
          // Get the guard instance from DI container
          const guard = this.moduleRef.get(GuardClass, { strict: false });

          if (!guard) {
            console.warn(
              `OrGuard: Could not resolve guard ${GuardClass.name} from DI container. ` +
                "Make sure the guard is provided in a module.",
            );
            continue;
          }

          // Call the guard's canActivate method
          const result = await guard.canActivate(context);

          // If any guard passes, allow access
          if (result === true) {
            return true;
          }
        } catch (error) {
          // Guard threw an exception - save it and continue to next guard
          errors.push(
            error instanceof Error
              ? error
              : new Error(`Guard ${GuardClass.name} failed: ${String(error)}`),
          );
          continue;
        }
      }

      // All guards failed
      // Throw the first error if we have any, otherwise return false
      if (errors.length > 0) {
        throw errors[0];
      }

      return false;
    }
  }

  return mixin(OrGuardMixin);
}
