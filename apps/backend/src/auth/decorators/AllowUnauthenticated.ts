import { Reflector } from '@nestjs/core';

/**
 * Decorator to explicitly mark a resolver as allowing unauthenticated access.
 */
export const AllowUnauthenticated = Reflector.createDecorator<true>({
  transform: () => true,
});
