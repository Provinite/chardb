/**
 * A player's Halloween candy board: anyone can look, and its owner sticks
 * their candies on it.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { MockedProvider, type MockedResponse } from "@apollo/client/testing";
import { ThemeProvider } from "styled-components";
import { lightTheme } from "@chardb/ui";

const COMMUNITY_ID = "11111111-1111-4111-8111-111111111111";

// jsdom has no PointerEvent, and without one a fired pointer event carries no
// coordinates, so no drag would ever look like it moved.
if (!("PointerEvent" in window)) {
  class PointerEventStub extends MouseEvent {
    readonly pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
    }
  }
  Object.assign(window, { PointerEvent: PointerEventStub });
}

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

    it("still places a tapped candy after one was dragged off the tray", async () => {
      renderPage("owner", [boardQuery("owner", board("owner", []))]);

      const dragged = await screen.findByRole("button", {
        name: "Place candy corn (2 left)",
      });
      // A drag that ends somewhere with no click after it, as a browser's
      // can when the pointer is let go away from where it went down.
      fireEvent.pointerDown(dragged, { clientX: 0, clientY: 0, pointerId: 1 });
      fireEvent.pointerMove(dragged, { clientX: 50, clientY: 50, pointerId: 1 });
      fireEvent.pointerUp(dragged, { clientX: 50, clientY: 50, pointerId: 1 });

      await userEvent.click(
        screen.getByRole("button", { name: "Place luther head (1 left)" }),
      );

      const pile = screen.getByRole("region", { name: "Candy board" });
      expect(
        within(pile).getAllByRole("img").map((i) => i.getAttribute("alt")),
      ).toEqual(["luther head"]);
    });

    it("turns a candy picked with the pointer from the keyboard", async () => {
      renderPage("owner", [boardQuery("owner", board("owner", [2]))]);

      const pile = await screen.findByRole("region", { name: "Candy board" });
      await userEvent.click(within(pile).getByRole("img"));
      await userEvent.keyboard("]");

      expect(within(pile).getByRole("img").style.transform).toBe(
        "translate(-50%, -50%) rotate(15deg)",
      );
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
