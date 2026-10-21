import type { InteractionResponseBody } from "../errors";

/** The reply for a command whose job moved to the Halloween page on chardb. */
export function movedToChardb(
  what: string,
  pageUrl: string | null,
): InteractionResponseBody {
  return {
    content: pageUrl
      ? `${what} moved to the Halloween page on chardb: ${pageUrl}`
      : `${what} moved to the Halloween page on chardb, under the community's Administration.`,
  };
}
