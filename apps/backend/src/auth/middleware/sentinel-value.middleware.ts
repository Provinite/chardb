import { FieldMiddleware, MiddlewareContext, NextFn } from "@nestjs/graphql";
import { TRUTHY_NULL, TRUTHY_EMPTY_STRING } from "../constants/sentinel-values";

/**
 * GraphQL field middleware that transforms sentinel values to their actual values.
 *
 * This works in conjunction with NullOnForbiddenFilter, which returns
 * truthy sentinel values when catching ForbiddenException. This middleware
 * then transforms those sentinels back to their actual null/empty string values.
 *
 * Apply with @Extensions({ middleware: [sentinelValueMiddleware] })
 */
export const sentinelValueMiddleware: FieldMiddleware = async (
  ctx: MiddlewareContext,
  next: NextFn,
) => {
  const value = await next();

  // Transform sentinel values to their actual values
  if (value === TRUTHY_NULL) {
    return null;
  }
  if (value === TRUTHY_EMPTY_STRING) {
    return "";
  }

  return value;
};
