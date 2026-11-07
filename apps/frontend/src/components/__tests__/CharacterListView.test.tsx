import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ApolloClient,
  ApolloLink,
  ApolloProvider,
  Observable,
} from "@apollo/client";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { lightTheme } from "@chardb/ui";
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
      <ApolloProvider client={recordingClient(asked)}>
        <ThemeProvider theme={lightTheme}>
          <MemoryRouter>
            <CharacterListView
              baseFilters={{ communityId: "co-1" }}
              defaultFilters={{ visibility: Visibility.Public }}
            />
          </MemoryRouter>
        </ThemeProvider>
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
