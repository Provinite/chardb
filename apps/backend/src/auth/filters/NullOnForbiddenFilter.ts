import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  ForbiddenException,
} from "@nestjs/common";
import { GqlContextType } from "@nestjs/graphql";
import { TRUTHY_NULL } from "../constants/sentinel-values";

/**
 * Exception filter that catches ForbiddenException in GraphQL field resolvers
 * and returns null instead of throwing an error.
 *
 * Returns TRUTHY_NULL sentinel which will be transformed back to actual null
 * by sentinelValueMiddleware.
 *
 * Apply with:
 * @UseFilters(NullOnForbiddenFilter)
 * @ResolveField("fieldName", () => Type, { nullable: true, middleware: [sentinelValueMiddleware] })
 */
@Catch(ForbiddenException)
export class NullOnForbiddenFilter implements ExceptionFilter {
  catch(exception: ForbiddenException, host: ArgumentsHost) {
    // Only handle GraphQL contexts
    if (host.getType<GqlContextType>() !== "graphql") {
      throw exception;
    }

    return TRUTHY_NULL;
  }
}
