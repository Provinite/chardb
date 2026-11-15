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

/**
 * An error the CLI reports by its message and exit code. `details` are
 * printed under the message, one per line.
 */
export class CliError extends Error {
  readonly details: Record<string, string | number> = {};

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

/** The stored credentials file cannot be read or parsed. */
export class CredentialsFileError extends UsageError {
  constructor(readonly path: string) {
    super(
      "The credentials file cannot be read. Delete it, or pipe a token into: yarn chardb auth add",
    );
    this.details.file = path;
  }
}

/** The API could not be reached at all. */
export class ApiUnreachableError extends CliError {
  constructor(readonly url: string) {
    super("Could not reach the API", EXIT.failed);
    this.details.url = url;
  }
}

/** Something answered, but not with a GraphQL response. */
export class NotGraphqlError extends CliError {
  constructor(
    readonly url: string,
    readonly status: number,
  ) {
    super("The API answered, but not with GraphQL", EXIT.failed);
    this.details.url = url;
    this.details.status = status;
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
      // One cause often fails every field of a request alike.
      [...new Set(errors.flatMap(errorMessages))].join("; ") ||
        "Request failed",
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
