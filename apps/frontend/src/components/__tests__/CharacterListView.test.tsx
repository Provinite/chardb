import { describe, it, expect } from "vitest";
import userEvent from "@testing-library/user-event";
import {
  ApolloClient,
  ApolloLink,
  ApolloProvider,
  Observable,
} from "@apollo/client";
import { render, screen, waitFor } from "../../__tests__/test-utils";
import { createCache } from "../../lib/apolloCache";
import { CharacterFiltersInput, Visibility } from "../../generated/graphql";
import { CharacterListView } from "../CharacterListView";

/** Answers every listing with nothing, recording the filters it was asked. */
const recordingClient = (asked: CharacterFiltersInput[]) =>
  new ApolloClient({
    cache: createCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          asked.push(operation.variables.filters);
          observer.next({
            data: {
              characters: {
                __typename: "CharacterConnection",
                characters: [],
                total: 0,
                hasMore: false,
              },
            },
          });
          observer.complete();
        }),
    ),
  });

describe("CharacterListView", () => {
  it("keeps the page's default filters through a search", async () => {
    const asked: CharacterFiltersInput[] = [];
    render(
      // Inside test-utils' MockedProvider, so this client is the one used.
      <ApolloProvider client={recordingClient(asked)}>
        <CharacterListView
          baseFilters={{ communityId: "co-1" }}
          defaultFilters={{ visibility: Visibility.Public }}
        />
      </ApolloProvider>,
    );

    await userEvent.type(
      screen.getByPlaceholderText(/Search characters/),
      "fox",
    );
    await userEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() =>
      expect(asked.at(-1)).toMatchObject({
        communityId: "co-1",
        visibility: Visibility.Public,
        search: "fox",
      }),
    );
  });
});
