import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  ForbiddenException,
} from "@nestjs/common";
import { GqlContextType } from "@nestjs/graphql";
import { TRUTHY_EMPTY_STRING } from "../constants/sentinel-values";

/**
 * Exception filter that catches ForbiddenException in GraphQL field resolvers
 * and returns a sentinel value instead of throwing an error.
 *
 * Returns TRUTHY_EMPTY_STRING which will be transformed back to an actual
 * empty string (or null) by SentinelValueInterceptor.
 *
 * Apply with @UseFilters(NullOnForbiddenFilter) and @UseInterceptors(SentinelValueInterceptor)
 */
@Catch(ForbiddenException)
export class NullOnForbiddenFilter implements ExceptionFilter {
  catch(exception: ForbiddenException, host: ArgumentsHost) {
    // Only handle GraphQL contexts
    if (host.getType<GqlContextType>() !== "graphql") {
      throw exception;
    }

    return TRUTHY_EMPTY_STRING;
  }
}
