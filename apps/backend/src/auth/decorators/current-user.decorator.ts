import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { UsersService } from '../../users/users.service';

/**
 * Type for the current user in request context.
 * This is the type returned by the users service findById method.
 */
export type CurrentUserType = Awaited<ReturnType<UsersService['findById']>>;

export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext): CurrentUserType => {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req.user;
  },
);