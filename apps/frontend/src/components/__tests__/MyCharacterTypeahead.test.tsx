/**
 * The upload page's character box: the shared `CharacterTypeahead`, fed by
 * the signed-in user's own characters.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MockedProvider, type MockedResponse } from "@apollo/client/testing";
import { ThemeProvider } from "styled-components";
import { lightTheme } from "@chardb/ui";
import { GetMyCharactersForImageUploadDocument } from "../../generated/graphql";
import { MyCharacterTypeahead } from "../MyCharacterTypeahead";

const character = (id: string, name: string) => ({
  __typename: "Character" as const,
  id,
  name,
  species: {
    __typename: "Species" as const,
    id: "sp-1",
    name: "Lanternkin",
    community: {
      __typename: "Community" as const,
      id: "co-1",
      slug: "willowmere",
    },
  },
});

const mine = (
  filters: { limit: number; search?: string },
  characters: ReturnType<typeof character>[],
): MockedResponse => ({
  request: {
    query: GetMyCharactersForImageUploadDocument,
    variables: { filters },
  },
  result: {
    data: {
      myCharactersForImageUpload: {
        __typename: "CharacterConnection",
        characters,
        total: characters.length,
        hasMore: false,
      },
    },
  },
});

const renderBox = (mocks: MockedResponse[]) => {
  const onChange = vi.fn();
  render(
    <MockedProvider mocks={mocks}>
      <ThemeProvider theme={lightTheme}>
        <MyCharacterTypeahead value={null} onChange={onChange} />
      </ThemeProvider>
    </MockedProvider>,
  );
  return onChange;
};

describe("MyCharacterTypeahead", () => {
  it("lists my characters as soon as it opens", async () => {
    renderBox([mine({ limit: 50 }, [character("ch-1", "Pumpkin Wisp")])]);
    await userEvent.click(screen.getByRole("combobox", { name: "Character" }));
    const option = await screen.findByRole("option", { name: /Pumpkin Wisp/ });
    expect(option).toHaveTextContent("Lanternkin");
  });

  it("searches my characters and picks one", async () => {
    const onChange = renderBox([
      mine({ limit: 50 }, [character("ch-1", "Pumpkin Wisp")]),
      mine({ limit: 50, search: "moth" }, [character("ch-2", "Moth Ghost")]),
    ]);
    await userEvent.type(
      screen.getByRole("combobox", { name: "Character" }),
      "moth",
    );
    await userEvent.click(
      await screen.findByRole("option", { name: /Moth Ghost/ }),
    );
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ id: "ch-2", name: "Moth Ghost" }),
    );
  });
});
