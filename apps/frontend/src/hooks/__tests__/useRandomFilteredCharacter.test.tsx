import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { MockedProvider, type MockedResponse } from "@apollo/client/testing";
import { MemoryRouter, useLocation } from "react-router-dom";
import { GetRandomCharacterPickDocument } from "../../generated/graphql";
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

const renderPick = (mocks: MockedResponse[], total: number) =>
  renderHook(
    () => ({
      pick: useRandomFilteredCharacter(
        { search: "fox", limit: 12, offset: 0 },
        total,
      ),
      location: useLocation(),
    }),
    {
      wrapper: ({ children }) => (
        <MockedProvider mocks={mocks}>
          <MemoryRouter initialEntries={["/characters"]}>{children}</MemoryRouter>
        </MockedProvider>
      ),
    },
  );

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
});
