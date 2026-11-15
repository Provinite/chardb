/**
 * Exit codes, so a script can tell what went wrong without reading stderr.
 *
 * 1: the request failed, or the user declined a confirmation.
 * 2: the command was used wrongly, or there is no token to use.
 * 3: the API refused the token, or the token may not do this.
 * 4: the lookup found nothing.
 */
export const EXIT = {
  ok: 0,
  failed: 1,
  usage: 2,
  refused: 3,
  notFound: 4,
} as const;

export type ExitCode = (typeof EXIT)[keyof typeof EXIT];

/** An error the CLI reports by its message and exit code alone. */
export class CliError extends Error {
  constructor(
    message: string,
    readonly exitCode: ExitCode,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class UsageError extends CliError {
  constructor(message: string) {
    super(message, EXIT.usage);
  }
}

export class NotFoundError extends CliError {
  constructor(message: string) {
    super(message, EXIT.notFound);
  }
}

export class DeclinedError extends CliError {
  constructor() {
    super("Cancelled", EXIT.failed);
  }
}

/** The API could not be reached, or answered with something other than GraphQL. */
export class ApiUnreachableError extends CliError {
  constructor(
    message: string,
    readonly url: string,
  ) {
    super(message, EXIT.failed);
  }
}

export interface GraphqlErrorEntry {
  message: string;
  extensions?: { code?: unknown; originalError?: unknown };
}

const REFUSAL_CODES = new Set(["UNAUTHENTICATED", "FORBIDDEN"]);

/** The API answered with GraphQL errors. */
export class GraphqlRequestError extends CliError {
  constructor(readonly errors: GraphqlErrorEntry[]) {
    super(
      errors.flatMap(errorMessages).join("; ") || "Request failed",
      exitCodeForErrors(errors),
    );
  }
}

/**
 * What went wrong, in words a person can act on. A failed input validation
 * says only "Bad Request Exception"; NestJS puts the validator's own messages
 * in `extensions.originalError.message`.
 */
function errorMessages(error: GraphqlErrorEntry): string[] {
  const original = error.extensions?.originalError;
  if (typeof original === "object" && original !== null) {
    const detail = (original as { message?: unknown }).message;
    if (Array.isArray(detail)) {
      const strings = detail.filter((m): m is string => typeof m === "string");
      if (strings.length) return strings;
    }
    if (typeof detail === "string" && detail) return [detail];
  }
  return [error.message];
}

/** 3 when the API turned the token away, 1 for anything else. */
export function exitCodeForErrors(errors: GraphqlErrorEntry[]): ExitCode {
  return errors.some((e) => REFUSAL_CODES.has(String(e.extensions?.code)))
    ? EXIT.refused
    : EXIT.failed;
}
