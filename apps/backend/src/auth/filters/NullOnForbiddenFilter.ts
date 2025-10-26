import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  ForbiddenException,
} from "@nestjs/common";
import { GqlContextType, GqlArgumentsHost } from "@nestjs/graphql";
import { GraphQLError } from "graphql";

/**
 * Exception filter that catches ForbiddenException in GraphQL field resolvers
 * and returns null instead of throwing an error.
 *
 * Apply with @UseFilters(NullOnForbiddenFilter)
 */
@Catch(ForbiddenException)
export class NullOnForbiddenFilter implements ExceptionFilter {
  catch(exception: ForbiddenException, host: ArgumentsHost) {
    // Only handle GraphQL contexts
    if (host.getType<GqlContextType>() !== "graphql") {
      throw exception;
    }

    const gqlHost = GqlArgumentsHost.create(host);
    const info = gqlHost.getInfo();

    // Return null for the field resolver
    // GraphQL will handle this gracefully as a null field value
    return null;
  }
}
