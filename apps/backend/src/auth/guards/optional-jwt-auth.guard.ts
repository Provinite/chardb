import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }

  // Override handleRequest to not throw errors if no token is provided
  handleRequest(err: any, user: any) {
    // If there's an error or no user, just return null instead of throwing
    if (err || !user) {
      return null;
    }
    return user;
  }
}
