import { describe, it, expect, vi, afterEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { MockedProvider, type MockedResponse } from "@apollo/client/testing";
import { MemoryRouter, useLocation } from "react-router-dom";
import {
  CharacterFiltersInput,
  GetRandomCharacterPickDocument,
} from "../../generated/graphql";
import { createCache } from "../../lib/apolloCache";
import { useRandomFilteredCharacter } from "../useRandomCharacter";

const pickAt = (
  offset: number,
  id: string | null,
  total: number,
): MockedResponse => ({
  request: {
    query: GetRandomCharacterPickDocument,
    variables: {
      filters: { search: "fox", limit: 1, offset },
    },
  },
  result: {
    data: {
      characters: {
        __typename: "CharacterConnection",
        characters: id ? [{ __typename: "Character", id }] : [],
        total,
      },
    },
  },
});

const FOX: CharacterFiltersInput = { search: "fox", limit: 12, offset: 0 };

const renderPick = (mocks: MockedResponse[], total: number) => {
  // The app's own cache, whose `characters` policy appends pages: a pick
  // that went through it would read back whatever an earlier pick cached.
  const cache = createCache();
  return renderHook(
    ({ filters }: { filters: CharacterFiltersInput }) => ({
      pick: useRandomFilteredCharacter(filters, total),
      location: useLocation(),
    }),
    {
      initialProps: { filters: FOX },
      wrapper: ({ children }) => (
        <MockedProvider mocks={mocks} cache={cache}>
          <MemoryRouter initialEntries={["/characters"]}>
            {children}
          </MemoryRouter>
        </MockedProvider>
      ),
    },
  );
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useRandomFilteredCharacter", () => {
  it("picks past the loaded page, under the listing's filters", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    const { result } = renderPick([pickAt(45, "c-45", 50)], 50);

    await act(() => result.current.pick.goToRandomCharacter());

    await waitFor(() =>
      expect(result.current.location.pathname).toBe("/character/c-45"),
    );
  });

  it("drops a pick that lands after the filters changed", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    const { result, rerender } = renderPick(
      [{ ...pickAt(45, "c-45", 50), delay: 50 }],
      50,
    );

    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.pick.goToRandomCharacter();
    });
    rerender({ filters: { search: "owl", limit: 12, offset: 0 } });
    await act(() => pending);

    expect(result.current.location.pathname).toBe("/characters");
    expect(result.current.pick.picking).toBe(false);
  });

  it("goes where the server says now, not where an earlier pick went", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    const { result } = renderPick(
      [pickAt(45, "c-45", 50), pickAt(45, "c-46", 50)],
      50,
    );

    await act(() => result.current.pick.goToRandomCharacter());
    await waitFor(() =>
      expect(result.current.location.pathname).toBe("/character/c-45"),
    );

    await act(() => result.current.pick.goToRandomCharacter());
    await waitFor(() =>
      expect(result.current.location.pathname).toBe("/character/c-46"),
    );
  });
});
