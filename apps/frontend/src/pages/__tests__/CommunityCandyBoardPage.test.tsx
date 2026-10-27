/**
 * A player's Halloween candy board: anyone can look, and its owner sticks
 * their candies on it.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { MockedProvider, type MockedResponse } from "@apollo/client/testing";
import { ThemeProvider } from "styled-components";
import { lightTheme } from "@chardb/ui";

const COMMUNITY_ID = "11111111-1111-4111-8111-111111111111";

const host = vi.hoisted(() => ({ halloweenEnabled: true }));
const auth = vi.hoisted(() => ({
  user: { id: "u-owner", username: "owner" } as {
    id: string;
    username: string;
  } | null,
}));

vi.mock("../../contexts/CommunityHostContext", async () => {
  const actual = await vi.importActual<
    typeof import("../../contexts/CommunityHostContext")
  >("../../contexts/CommunityHostContext");
  return {
    ...actual,
    useCommunityId: () => COMMUNITY_ID,
    useHostCommunity: () => ({
      id: COMMUNITY_ID,
      name: "Cloverse",
      slug: "cloverse",
      halloweenEnabled: host.halloweenEnabled,
    }),
  };
});

vi.mock("../../contexts/AuthContext", async () => {
  const actual = await vi.importActual<
    typeof import("../../contexts/AuthContext")
  >("../../contexts/AuthContext");
  return { ...actual, useAuth: () => ({ user: auth.user }) };
});

vi.mock("react-hot-toast", () => {
  const stub = { success: vi.fn(), error: vi.fn() };
  return { default: stub, toast: stub, Toaster: () => null };
});

import {
  HalloweenCandyBoardDocument,
  SaveHalloweenCandyBoardDocument,
} from "../../generated/graphql";
import { CommunityCandyBoardPage } from "../CommunityCandyBoardPage";

const candy = (knockEventId: number, slug: string) => ({
  __typename: "HalloweenCandy" as const,
  knockEventId,
  slug,
  receivedAt: "2026-10-20T00:00:00.000Z",
});

const placement = (knockEventId: number) => ({
  __typename: "HalloweenCandyPlacement" as const,
  knockEventId,
  x: 0.5,
  y: 0.5,
  rotation: 0,
  scale: 1,
});

const board = (username: string, placed: number[]) => ({
  __typename: "HalloweenCandyBoard" as const,
  owner: {
    __typename: "User" as const,
    id: `u-${username}`,
    username,
    displayName: null,
  },
  candies: [
    candy(1, "candy-corn"),
    candy(2, "luther-head"),
    candy(3, "candy-corn"),
  ],
  placements: placed.map(placement),
});

const boardQuery = (
  username: string,
  result: ReturnType<typeof board> | null,
): MockedResponse => ({
  request: {
    query: HalloweenCandyBoardDocument,
    variables: { communityId: COMMUNITY_ID, username },
  },
  result: { data: { halloweenCandyBoard: result } },
});

const renderPage = (username: string, mocks: MockedResponse[]) =>
  render(
    <ThemeProvider theme={lightTheme}>
      <MockedProvider mocks={mocks}>
        <MemoryRouter initialEntries={[`/halloween/board/${username}`]}>
          <Routes>
            <Route
              path="/halloween/board/:username"
              element={<CommunityCandyBoardPage />}
            />
          </Routes>
        </MemoryRouter>
      </MockedProvider>
    </ThemeProvider>,
  );

describe("CommunityCandyBoardPage", () => {
  beforeEach(() => {
    host.halloweenEnabled = true;
    auth.user = { id: "u-owner", username: "owner" };
  });

  describe("someone else's board", () => {
    it("shows their placed candies, and nothing to edit with", async () => {
      renderPage("friend", [boardQuery("friend", board("friend", [2]))]);

      const pile = await screen.findByRole("region", { name: "Candy board" });
      expect(
        within(pile)
          .getAllByRole("img")
          .map((i) => i.getAttribute("alt")),
      ).toEqual(["luther head"]);
      expect(screen.getByText("friend's candy board")).toBeInTheDocument();
      expect(screen.getByText("3 candies collected")).toBeInTheDocument();
      expect(
        screen.queryByRole("region", { name: "Your candies" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Copy link" }),
      ).not.toBeInTheDocument();
    });

    it("says when they have no board", async () => {
      renderPage("friend", [boardQuery("friend", null)]);
      expect(
        await screen.findByText("friend doesn't have a candy board yet."),
      ).toBeInTheDocument();
    });
  });

  describe("your own board", () => {
    it("lists the candies not on the board, grouped by kind", async () => {
      renderPage("owner", [boardQuery("owner", board("owner", [2]))]);

      const tray = await screen.findByRole("region", { name: "Your candies" });
      const kinds = within(tray).getAllByRole("button");
      expect(kinds).toHaveLength(1);
      expect(kinds[0]).toHaveAccessibleName("Place candy corn (2 left)");
      expect(screen.getByText("Your candy board")).toBeInTheDocument();
    });

    it("places a candy from the tray and saves the board", async () => {
      const saved = vi.fn(() => ({
        data: { saveHalloweenCandyBoard: board("owner", [2, 1]) },
      }));
      renderPage("owner", [
        boardQuery("owner", board("owner", [2])),
        {
          request: {
            query: SaveHalloweenCandyBoardDocument,
            variables: {
              communityId: COMMUNITY_ID,
              placements: [
                { knockEventId: 2, x: 0.5, y: 0.5, rotation: 0, scale: 1 },
                { knockEventId: 1, x: 0.5, y: 0.5, rotation: 0, scale: 1 },
              ],
            },
          },
          result: saved,
        },
      ]);

      await userEvent.click(
        await screen.findByRole("button", {
          name: "Place candy corn (2 left)",
        }),
      );

      const pile = screen.getByRole("region", { name: "Candy board" });
      expect(within(pile).getAllByRole("img")).toHaveLength(2);
      await waitFor(() => expect(saved).toHaveBeenCalled(), {
        timeout: 2000,
      });
      expect(await screen.findByText("Saved")).toBeInTheDocument();
    });

    it("puts the selected candy back in the tray", async () => {
      renderPage("owner", [boardQuery("owner", board("owner", [2]))]);

      const pile = await screen.findByRole("region", { name: "Candy board" });
      await userEvent.click(within(pile).getByRole("img"));
      await userEvent.click(
        screen.getByRole("button", { name: "Back to tray" }),
      );

      expect(within(pile).queryAllByRole("img")).toHaveLength(0);
      expect(
        screen.getByRole("button", { name: "Place luther head (1 left)" }),
      ).toBeInTheDocument();
    });

    it("offers a link to share", async () => {
      renderPage("owner", [boardQuery("owner", board("owner", []))]);
      expect(
        await screen.findByRole("button", { name: "Copy link" }),
      ).toBeInTheDocument();
    });

    it("asks you to link Discord when you have no board", async () => {
      renderPage("owner", [boardQuery("owner", null)]);
      expect(
        await screen.findByText(
          "Link your Discord account to collect candies here.",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Link Discord" }),
      ).toHaveAttribute("href", "/profile/edit");
    });
  });

  it("says when the event is not running here", () => {
    host.halloweenEnabled = false;
    renderPage("owner", []);
    expect(
      screen.getByText("Halloween isn't running in this community."),
    ).toBeInTheDocument();
  });
});
