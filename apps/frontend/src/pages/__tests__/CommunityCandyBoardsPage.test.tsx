/**
 * A player's candy boards: every one listed with a picture of it, a new one
 * made, and one deleted.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { MockedProvider, type MockedResponse } from "@apollo/client/testing";
import { GraphQLError } from "graphql";
import { ThemeProvider } from "styled-components";
import { lightTheme } from "@chardb/ui";
import { MantineProvider } from "@mantine/core";
import {
  CreateHalloweenCandyBoardDocument,
  DeleteHalloweenCandyBoardDocument,
  MyHalloweenCandyBoardsDocument,
} from "../../generated/graphql";
import { CommunityCandyBoardsPage } from "../CommunityCandyBoardsPage";

const COMMUNITY_ID = "11111111-1111-4111-8111-111111111111";
const FIRST = "22222222-2222-4222-8222-222222222222";
const SECOND = "33333333-3333-4333-8333-333333333333";

const host = vi.hoisted(() => ({ halloweenEnabled: true }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

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

vi.mock("react-hot-toast", () => ({
  default: toast,
  toast,
  Toaster: () => null,
}));

const board = (
  id: string,
  {
    name = null as {
      first: string;
      joiner: string | null;
      last: string;
    } | null,
    placed = [] as number[],
  } = {},
) => ({
  __typename: "HalloweenCandyBoard" as const,
  id,
  viewerIsOwner: true,
  background: null,
  backgroundEffects: null,
  lighting: null,
  name: name && { __typename: "HalloweenCandyBoardName" as const, ...name },
  owner: {
    __typename: "User" as const,
    id: "u-owner",
    username: "owner",
    displayName: null,
  },
  candies: [
    {
      __typename: "HalloweenCandy" as const,
      knockEventId: 1,
      slug: "candy-corn",
      receivedAt: "2026-10-20T00:00:00.000Z",
    },
  ],
  placements: placed.map((candy) => ({
    __typename: "HalloweenCandyPlacement" as const,
    sticker: {
      __typename: "HalloweenSticker" as const,
      candy,
      nameplate: null,
    },
    x: 0.5,
    y: 0.5,
    rotation: 0,
    scale: 1,
  })),
});

const boardsQuery = (
  boards: ReturnType<typeof board>[] | null,
): MockedResponse => ({
  request: {
    query: MyHalloweenCandyBoardsDocument,
    variables: { communityId: COMMUNITY_ID },
  },
  result: { data: { myHalloweenCandyBoards: boards } },
});

const renderPage = (mocks: MockedResponse[]) =>
  render(
    <ThemeProvider theme={lightTheme}>
      <MantineProvider>
        <MockedProvider mocks={mocks}>
          <MemoryRouter initialEntries={["/halloween/board"]}>
            <Routes>
              <Route
                path="/halloween/board"
                element={<CommunityCandyBoardsPage />}
              />
              <Route
                path="/halloween/board/:boardId"
                element={<p>Opened a board</p>}
              />
            </Routes>
          </MemoryRouter>
        </MockedProvider>
      </MantineProvider>
    </ThemeProvider>,
  );

const spooky = { first: "Spooky", joiner: null, last: "Cauldron" };

describe("CommunityCandyBoardsPage", () => {
  beforeEach(() => {
    host.halloweenEnabled = true;
    vi.clearAllMocks();
  });

  it("lists each board with a picture of it, its name and its stickers", async () => {
    renderPage([
      boardsQuery([board(FIRST, { name: spooky, placed: [1] }), board(SECOND)]),
    ]);
    const cards = await screen.findAllByRole("article");
    expect(cards).toHaveLength(2);

    expect(
      within(cards[0]).getByRole("heading", { name: "Spooky Cauldron" }),
    ).toBeInTheDocument();
    expect(within(cards[0]).getByText("1 sticker")).toBeInTheDocument();
    expect(
      within(
        within(cards[0]).getByRole("region", { name: "Candy board" }),
      ).getAllByRole("img"),
    ).toHaveLength(1);
    expect(
      within(cards[0]).getByRole("link", { name: "Open Spooky Cauldron" }),
    ).toHaveAttribute("href", `/halloween/board/${FIRST}`);

    expect(
      within(cards[1]).getByRole("heading", { name: "Untitled board" }),
    ).toBeInTheDocument();
    expect(within(cards[1]).getByText("No stickers yet")).toBeInTheDocument();
  });

  it("asks for a first board when there are none", async () => {
    renderPage([boardsQuery([])]);
    expect(
      await screen.findByRole("button", { name: "Create your first board" }),
    ).toBeInTheDocument();
    expect(screen.queryAllByRole("article")).toHaveLength(0);
  });

  it("makes a new board, and opens it", async () => {
    const made = vi.fn(() => ({
      data: { createHalloweenCandyBoard: board(SECOND) },
    }));
    renderPage([
      boardsQuery([board(FIRST)]),
      {
        request: {
          query: CreateHalloweenCandyBoardDocument,
          variables: { communityId: COMMUNITY_ID },
        },
        result: made,
      },
    ]);
    await userEvent.click(
      await screen.findByRole("button", { name: "New board" }),
    );
    expect(await screen.findByText("Opened a board")).toBeInTheDocument();
    expect(made).toHaveBeenCalled();
  });

  it("says why a board could not be made", async () => {
    renderPage([
      boardsQuery([board(FIRST)]),
      {
        request: {
          query: CreateHalloweenCandyBoardDocument,
          variables: { communityId: COMMUNITY_ID },
        },
        result: {
          errors: [new GraphQLError("You can have at most 10 candy boards")],
        },
      },
    ]);
    await userEvent.click(
      await screen.findByRole("button", { name: "New board" }),
    );
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "You can have at most 10 candy boards",
      ),
    );
  });

  it("stops at ten boards, and says so", async () => {
    const ten = Array.from({ length: 10 }, (_, i) =>
      board(`22222222-2222-4222-8222-${String(i).padStart(12, "0")}`),
    );
    renderPage([boardsQuery(ten)]);
    expect(
      await screen.findByRole("button", { name: "New board" }),
    ).toBeDisabled();
    expect(screen.getByText(/10 boards is the most/)).toBeInTheDocument();
  });

  it("deletes a board once confirmed, and lists the rest", async () => {
    const deleted = vi.fn(() => ({
      data: { deleteHalloweenCandyBoard: true },
    }));
    renderPage([
      boardsQuery([board(FIRST, { name: spooky }), board(SECOND)]),
      {
        request: {
          query: DeleteHalloweenCandyBoardDocument,
          variables: { communityId: COMMUNITY_ID, id: FIRST },
        },
        result: deleted,
      },
      boardsQuery([board(SECOND)]),
    ]);
    const [first] = await screen.findAllByRole("article");
    await userEvent.click(
      within(first).getByRole("button", { name: "Delete Spooky Cauldron" }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Delete Spooky Cauldron?");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Delete" }),
    );

    await waitFor(() => expect(deleted).toHaveBeenCalled());
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(1));
  });

  it("asks to link Discord first", async () => {
    renderPage([boardsQuery(null)]);
    expect(
      await screen.findByRole("link", { name: "Link Discord" }),
    ).toHaveAttribute("href", "/profile/edit");
  });

  it("says when the community has no Discord server", async () => {
    renderPage([
      {
        request: {
          query: MyHalloweenCandyBoardsDocument,
          variables: { communityId: COMMUNITY_ID },
        },
        result: {
          errors: [
            new GraphQLError("This community has no Discord server linked"),
          ],
        },
      },
    ]);
    expect(
      await screen.findByText("This community has no Discord server linked"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Link Discord" }),
    ).not.toBeInTheDocument();
  });

  it("says so while the event is off", async () => {
    host.halloweenEnabled = false;
    renderPage([]);
    expect(
      await screen.findByText("Halloween isn't running in this community."),
    ).toBeInTheDocument();
  });
});
