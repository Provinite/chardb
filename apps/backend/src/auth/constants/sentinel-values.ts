/**
 * Sentinel values used to bypass NestJS's truthy value requirement
 * when returning from exception filters.
 *
 * These are transformed back to their actual values by SentinelValueInterceptor.
 */

/**
 * Represents a null value that is truthy for NestJS exception filters.
 * Will be transformed to actual null by SentinelValueInterceptor.
 */
export const TRUTHY_NULL = Symbol("TRUTHY_NULL");

/**
 * Represents an empty string that is truthy for NestJS exception filters.
 * Will be transformed to actual empty string by SentinelValueInterceptor.
 */
export const TRUTHY_EMPTY_STRING = Symbol("TRUTHY_EMPTY_STRING");

export const TRUTHY_FALSE = Symbol("TRUTHY_FALSE");
