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
 * and returns an empty string instead of throwing an error.
 *
 * Returns TRUTHY_EMPTY_STRING sentinel which will be transformed back to actual
 * empty string by sentinelValueMiddleware.
 *
 * Apply with:
 * @UseFilters(EmptyStringOnForbiddenFilter)
 * @ResolveField("fieldName", () => String, { middleware: [sentinelValueMiddleware] })
 */
@Catch(ForbiddenException)
export class EmptyStringOnForbiddenFilter implements ExceptionFilter {
  catch(exception: ForbiddenException, host: ArgumentsHost) {
    // Only handle GraphQL contexts
    if (host.getType<GqlContextType>() !== "graphql") {
      throw exception;
    }

    return TRUTHY_EMPTY_STRING;
  }
}
