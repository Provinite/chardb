import * as winston from "winston";

/**
 * How deep a chain of `cause`s is followed. Deeper than this is almost
 * always a loop or a wrapper wrapping itself.
 */
const MAX_CAUSE_DEPTH = 5;

export interface SerializedError {
  name: string;
  message: string;
  stack?: string;
  cause?: SerializedError | unknown;
  [field: string]: unknown;
}

function serialize(error: Error, depth: number): SerializedError {
  const out: SerializedError = {
    // A typed error's own fields first, so `name` and `message` below win.
    ...Object.fromEntries(Object.entries(error)),
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
  const { cause } = error;
  if (cause !== undefined) {
    out.cause =
      cause instanceof Error && depth < MAX_CAUSE_DEPTH
        ? serialize(cause, depth + 1)
        : cause instanceof Error
          ? { name: cause.name, message: cause.message }
          : cause;
  }
  return out;
}

/**
 * Serializes the `err` field of a log line, and only that one: name,
 * message, stack, a typed error's own fields and its chain of causes. An
 * `Error` serializes to `{}` otherwise, since none of those are enumerable.
 *
 *   this.logger.warn({ message: "Static message", userId, err });
 *
 * Every other field is left alone, so a line without `err` costs one
 * property lookup.
 */
export const errFormat = winston.format((info) => {
  const err: unknown = info.err;
  if (err instanceof Error) {
    info.err = serialize(err, 1);
  }
  return info;
});
