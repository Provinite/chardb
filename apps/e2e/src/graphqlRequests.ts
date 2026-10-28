import type { Page } from "@playwright/test";

/**
 * The `filters.search` of every `operationName` query the page sends from now
 * on, in order. For asserting how often a search box reaches the server.
 */
export const recordSearches = (page: Page, operationName: string) => {
  const searches: Array<string | undefined> = [];
  page.on("request", (request) => {
    // postDataJSON throws on a body that is not JSON, such as an upload. A
    // throw inside this listener would fail whatever test attached it.
    let body: unknown;
    try {
      body = request.postDataJSON();
    } catch {
      return;
    }
    if (
      typeof body === "object" &&
      body !== null &&
      "operationName" in body &&
      body.operationName === operationName &&
      "variables" in body
    ) {
      const { variables } = body as {
        variables: { filters: { search?: string } };
      };
      searches.push(variables.filters.search);
    }
  });
  return searches;
};
