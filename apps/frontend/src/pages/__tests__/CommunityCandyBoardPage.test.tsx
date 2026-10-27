/**
 * A player's Halloween candy board: anyone with its link can look, and its
 * owner sticks their candies on it.
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
import { GraphQLError } from "graphql";
import { ThemeProvider } from "styled-components";
import { lightTheme } from "@chardb/ui";
import { MantineProvider } from "@mantine/core";

const COMMUNITY_ID = "11111111-1111-4111-8111-111111111111";
const BOARD_ID = "22222222-2222-4222-8222-222222222222";

// jsdom has no PointerEvent, and without one a fired pointer event carries no
// coordinates, so no drag would ever look like it moved.
if (!("PointerEvent" in window)) {
  class PointerEventStub extends MouseEvent {
    readonly pointerId: number;
    readonly pointerType: string;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
      this.pointerType = init.pointerType ?? "mouse";
    }
  }
  Object.assign(window, { PointerEvent: PointerEventStub });
}

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

import {
  ApplyHalloweenCandyBoardActionsDocument,
  HalloweenCandyBoardDocument,
  MyHalloweenCandyBoardDocument,
  type HalloweenCandyBoardAction,
} from "../../generated/graphql";
import {
  CommunityCandyBoardPage,
  MyCandyBoardRedirect,
} from "../CommunityCandyBoardPage";

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

const board = (
  placed: number[],
  { viewerIsOwner = true, owner = "owner" as string | null } = {},
) => ({
  __typename: "HalloweenCandyBoard" as const,
  id: BOARD_ID,
  viewerIsOwner,
  owner: owner
    ? {
        __typename: "User" as const,
        id: `u-${owner}`,
        username: owner,
        displayName: null,
      }
    : null,
  candies: [
    candy(1, "candy-corn"),
    candy(2, "luther-head"),
    candy(3, "candy-corn"),
  ],
  placements: placed.map(placement),
});

const boardQuery = (
  result: ReturnType<typeof board> | null,
): MockedResponse => ({
  request: {
    query: HalloweenCandyBoardDocument,
    variables: { communityId: COMMUNITY_ID, id: BOARD_ID },
  },
  result: { data: { halloweenCandyBoard: result } },
});

const ADD_CORN: HalloweenCandyBoardAction = {
  add: { knockEventId: 1, x: 0.5, y: 0.5, rotation: 0, scale: 1 },
};

const applyMock = (
  actions: HalloweenCandyBoardAction[],
  outcome:
    | { board: ReturnType<typeof board> }
    | { networkError: Error }
    | { graphQLError: string },
): MockedResponse => ({
  request: {
    query: ApplyHalloweenCandyBoardActionsDocument,
    variables: { communityId: COMMUNITY_ID, actions },
  },
  ...("board" in outcome
    ? { result: { data: { applyHalloweenCandyBoardActions: outcome.board } } }
    : "networkError" in outcome
      ? { error: outcome.networkError }
      : { result: { errors: [new GraphQLError(outcome.graphQLError)] } }),
});

const renderAt = (path: string, mocks: MockedResponse[]) =>
  render(
    <ThemeProvider theme={lightTheme}>
      <MantineProvider>
        <MockedProvider mocks={mocks}>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route
                path="/halloween/board"
                element={<MyCandyBoardRedirect />}
              />
              <Route
                path="/halloween/board/:boardId"
                element={<CommunityCandyBoardPage />}
              />
            </Routes>
          </MemoryRouter>
        </MockedProvider>
      </MantineProvider>
    </ThemeProvider>,
  );

const renderBoard = (mocks: MockedResponse[]) =>
  renderAt(`/halloween/board/${BOARD_ID}`, mocks);

const pile = () => screen.findByRole("region", { name: "Candy board" });

/** jsdom lays nothing out: gives the board a 400 x 300 box at the origin. */
const sized = (region: HTMLElement) => {
  region.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      width: 400,
      height: 300,
      right: 400,
      bottom: 300,
    }) as DOMRect;
  return region;
};

/** What positions, sizes and rotates a candy on the board. */
const frameOf = (img: HTMLElement) => img.parentElement as HTMLElement;
const placedNames = async () =>
  within(await pile())
    .queryAllByRole("img")
    .map((i) => i.getAttribute("alt"));

describe("CommunityCandyBoardPage", () => {
  beforeEach(() => {
    host.halloweenEnabled = true;
    toast.error.mockClear();
  });

  describe("your own board's address", () => {
    const myBoard = (result: MockedResponse["result"]): MockedResponse => ({
      request: {
        query: MyHalloweenCandyBoardDocument,
        variables: { communityId: COMMUNITY_ID },
      },
      result,
    });

    it("takes you to your board", async () => {
      renderAt("/halloween/board", [
        myBoard({
          data: {
            myHalloweenCandyBoard: {
              __typename: "HalloweenCandyBoard",
              id: BOARD_ID,
            },
          },
        }),
        boardQuery(board([2])),
      ]);
      expect(await screen.findByText("Your candy board")).toBeInTheDocument();
    });

    it("asks you to link Discord when you have no board", async () => {
      renderAt("/halloween/board", [
        myBoard({ data: { myHalloweenCandyBoard: null } }),
      ]);
      expect(
        await screen.findByText(
          "Link your Discord account to collect candies here.",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Link Discord" }),
      ).toHaveAttribute("href", "/profile/edit");
    });

    it("says when the community has no Discord server", async () => {
      renderAt("/halloween/board", [
        myBoard({
          errors: [
            new GraphQLError("This community has no Discord server linked"),
          ],
        }),
      ]);
      expect(
        await screen.findByText("This community has no Discord server linked"),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: "Link Discord" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("someone else's board", () => {
    it("shows their placed candies, and nothing to edit with", async () => {
      renderBoard([
        boardQuery(board([2], { viewerIsOwner: false, owner: "friend" })),
      ]);

      expect(await placedNames()).toEqual(["luther head"]);
      expect(screen.getByText("friend's candy board")).toBeInTheDocument();
      expect(screen.getByText("3 candies collected")).toBeInTheDocument();
      expect(
        screen.queryByRole("region", { name: "Your candies" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Copy link" }),
      ).not.toBeInTheDocument();
    });

    it("has no name to show once its owner unlinked Discord", async () => {
      renderBoard([
        boardQuery(board([], { viewerIsOwner: false, owner: null })),
      ]);
      expect(await screen.findByText("A candy board")).toBeInTheDocument();
    });

    it("says when there is no such board", async () => {
      renderBoard([boardQuery(null)]);
      expect(
        await screen.findByText("There's no candy board here."),
      ).toBeInTheDocument();
    });
  });

  describe("your own board", () => {
    it("lists the candies not on the board, grouped by kind", async () => {
      renderBoard([boardQuery(board([2]))]);

      const tray = await screen.findByRole("region", { name: "Your candies" });
      const kinds = within(tray).getAllByRole("button");
      expect(kinds).toHaveLength(1);
      expect(kinds[0]).toHaveAccessibleName("Place candy corn (2 left)");
      expect(screen.getByText("Your candy board")).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent("Saved");
    });

    it("shows a change as unsaved until the server has it", async () => {
      renderBoard([
        boardQuery(board([2])),
        applyMock([ADD_CORN], { board: board([2, 1]) }),
      ]);

      await userEvent.click(
        await screen.findByRole("button", {
          name: "Place candy corn (2 left)",
        }),
      );

      expect(await placedNames()).toEqual(["luther head", "candy corn"]);
      expect(screen.getByRole("status")).toHaveTextContent("Unsaved changes");
      await waitFor(
        () => expect(screen.getByRole("status")).toHaveTextContent("Saved"),
        { timeout: 2000 },
      );
    });

    it("keeps a change that could not reach the server, and retries it", async () => {
      renderBoard([
        boardQuery(board([2])),
        applyMock([ADD_CORN], { networkError: new Error("offline") }),
        applyMock([ADD_CORN], { board: board([2, 1]) }),
      ]);

      await userEvent.click(
        await screen.findByRole("button", {
          name: "Place candy corn (2 left)",
        }),
      );
      await waitFor(
        () => expect(screen.getByRole("status")).toHaveTextContent("Not saved"),
        { timeout: 2000 },
      );
      expect(await placedNames()).toEqual(["luther head", "candy corn"]);

      await userEvent.click(screen.getByRole("button", { name: "Retry" }));
      await waitFor(
        () => expect(screen.getByRole("status")).toHaveTextContent("Saved"),
        { timeout: 2000 },
      );
    });

    it("undoes a change the server refused, and says why", async () => {
      renderBoard([
        boardQuery(board([2])),
        applyMock([ADD_CORN], {
          graphQLError: "Only your own candies can go on your board",
        }),
      ]);

      await userEvent.click(
        await screen.findByRole("button", {
          name: "Place candy corn (2 left)",
        }),
      );
      await waitFor(
        () =>
          expect(toast.error).toHaveBeenCalledWith(
            "Only your own candies can go on your board",
          ),
        { timeout: 2000 },
      );
      expect(await placedNames()).toEqual(["luther head"]);
      expect(screen.getByRole("status")).toHaveTextContent("Saved");
    });

    it("warns before leaving with changes not yet saved", async () => {
      renderBoard([boardQuery(board([2]))]);

      await userEvent.click(
        await screen.findByRole("button", {
          name: "Place candy corn (2 left)",
        }),
      );
      const leaving = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(leaving);
      expect(leaving.defaultPrevented).toBe(true);
    });

    it("does not warn before leaving once everything is saved", async () => {
      renderBoard([boardQuery(board([2]))]);
      await screen.findByRole("region", { name: "Your candies" });
      const leaving = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(leaving);
      expect(leaving.defaultPrevented).toBe(false);
    });

    it("still places a tapped candy after one was dragged off the tray", async () => {
      renderBoard([boardQuery(board([]))]);

      const dragged = await screen.findByRole("button", {
        name: "Place candy corn (2 left)",
      });
      // A drag that ends somewhere with no click after it, as a browser's
      // can when the pointer is let go away from where it went down.
      fireEvent.pointerDown(dragged, { clientX: 0, clientY: 0, pointerId: 1 });
      fireEvent.pointerMove(dragged, {
        clientX: 50,
        clientY: 50,
        pointerId: 1,
      });
      fireEvent.pointerUp(dragged, { clientX: 50, clientY: 50, pointerId: 1 });

      await userEvent.click(
        screen.getByRole("button", { name: "Place luther head (1 left)" }),
      );
      expect(await placedNames()).toEqual(["luther head"]);
    });

    it("does not start a tray drag from a touch, so a swipe can scroll", async () => {
      renderBoard([boardQuery(board([]))]);

      const touched = await screen.findByRole("button", {
        name: "Place candy corn (2 left)",
      });
      fireEvent.pointerDown(touched, {
        clientX: 0,
        clientY: 0,
        pointerId: 1,
        pointerType: "touch",
      });
      fireEvent.pointerMove(touched, {
        clientX: 0,
        clientY: 80,
        pointerId: 1,
        pointerType: "touch",
      });
      expect(document.querySelectorAll("img[alt='']")).toHaveLength(2);
    });

    it("moves a candy only with the pointer that grabbed it", async () => {
      renderBoard([boardQuery(board([2]))]);

      const region = sized(await pile());
      const luther = within(region).getByRole("img");
      fireEvent.pointerDown(luther, {
        clientX: 200,
        clientY: 150,
        pointerId: 1,
      });
      fireEvent.pointerMove(region, { clientX: 0, clientY: 0, pointerId: 2 });
      expect(frameOf(luther).style.left).toBe("50%");
      fireEvent.pointerMove(region, {
        clientX: 100,
        clientY: 150,
        pointerId: 1,
      });
      expect(frameOf(luther).style.left).toBe("25%");
    });

    it("rotates a candy picked with the pointer from the keyboard", async () => {
      renderBoard([boardQuery(board([2]))]);

      const region = await pile();
      await userEvent.click(within(region).getByRole("img"));
      await userEvent.keyboard("]");

      expect(frameOf(within(region).getByRole("img")).style.transform).toBe(
        "translate(-50%, -50%) rotate(15deg)",
      );
    });

    const LAYER_BUTTONS = [
      "Bring to front",
      "Bring forward",
      "Send backward",
      "Send to back",
    ];

    it("keeps the controls in view but disabled until a candy is selected", async () => {
      renderBoard([boardQuery(board([2, 1, 3]))]);

      await pile();
      const controls = [
        screen.getByLabelText("Rotate"),
        screen.getByLabelText("Scale"),
        ...LAYER_BUTTONS.map((name) => screen.getByRole("button", { name })),
        screen.getByRole("button", { name: "Back to tray" }),
      ];
      for (const control of controls) expect(control).toBeDisabled();

      // The middle of three: every control has something to do.
      await userEvent.click(within(await pile()).getAllByRole("img")[1]);
      for (const control of controls) expect(control).toBeEnabled();
    });

    it("disables the layer buttons that would not move the candy", async () => {
      renderBoard([boardQuery(board([2, 1]))]);

      const [bottom, top] = within(await pile()).getAllByRole("img");
      const button = (name: string) => screen.getByRole("button", { name });

      await userEvent.click(top);
      expect(button("Bring to front")).toBeDisabled();
      expect(button("Bring forward")).toBeDisabled();
      expect(button("Send backward")).toBeEnabled();
      expect(button("Send to back")).toBeEnabled();

      await userEvent.click(bottom);
      expect(button("Bring to front")).toBeEnabled();
      expect(button("Bring forward")).toBeEnabled();
      expect(button("Send backward")).toBeDisabled();
      expect(button("Send to back")).toBeDisabled();
    });

    it.each([
      ["Bring to front", 0, ["candy corn", "banana", "luther head"]],
      ["Bring forward", 0, ["candy corn", "luther head", "banana"]],
      ["Send backward", 2, ["luther head", "banana", "candy corn"]],
      ["Send to back", 2, ["banana", "luther head", "candy corn"]],
    ])(
      "%s moves the selected candy in the pile",
      async (name, index, order) => {
        // Three different candies, so every order can be told apart.
        const three = board([2, 1, 4]);
        renderBoard([
          boardQuery({
            ...three,
            candies: [...three.candies, candy(4, "banana")],
          }),
        ]);

        await userEvent.click(within(await pile()).getAllByRole("img")[index]);
        await userEvent.click(screen.getByRole("button", { name }));

        expect(await placedNames()).toEqual(order);
      },
    );

    it("names each layer button in a tooltip", async () => {
      renderBoard([boardQuery(board([2, 1]))]);

      await userEvent.click(within(await pile()).getAllByRole("img")[0]);
      await userEvent.hover(
        screen.getByRole("button", { name: "Bring forward" }),
      );
      expect(await screen.findByRole("tooltip")).toHaveTextContent(
        "Bring forward",
      );
    });

    describe("picking a candy out of a pile", () => {
      /** A click at the board's centre, where both test candies sit. */
      const clickCentre = (region: HTMLElement) => {
        fireEvent.pointerDown(region, {
          clientX: 200,
          clientY: 150,
          pointerId: 1,
        });
        fireEvent.pointerUp(region, {
          clientX: 200,
          clientY: 150,
          pointerId: 1,
        });
      };
      const forward = () =>
        screen.getByRole("button", { name: "Bring forward" });

      it("picks the top candy, then the one under it, then the top again", async () => {
        renderBoard([boardQuery(board([2, 1]))]);
        const region = sized(await pile());

        // The candy corn is on top: nothing to bring it forward past.
        clickCentre(region);
        expect(forward()).toBeDisabled();
        clickCentre(region);
        expect(forward()).toBeEnabled();
        clickCentre(region);
        expect(forward()).toBeDisabled();
      });

      it("keeps the selected candy when it is dragged, and moves it", async () => {
        renderBoard([boardQuery(board([2, 1]))]);
        const region = sized(await pile());
        clickCentre(region);
        clickCentre(region); // Luther, underneath.
        const luther = within(region).getAllByRole("img")[0];

        fireEvent.pointerDown(region, {
          clientX: 200,
          clientY: 150,
          pointerId: 1,
        });
        fireEvent.pointerMove(region, {
          clientX: 100,
          clientY: 150,
          pointerId: 1,
        });
        fireEvent.pointerUp(region, {
          clientX: 100,
          clientY: 150,
          pointerId: 1,
        });

        expect(frameOf(luther).style.left).toBe("25%");
        expect(forward()).toBeEnabled();
      });

      it("saves nothing for a click that does not move the candy", async () => {
        renderBoard([boardQuery(board([2, 1]))]);
        const region = sized(await pile());

        fireEvent.pointerDown(region, {
          clientX: 200,
          clientY: 150,
          pointerId: 1,
        });
        fireEvent.pointerMove(region, {
          clientX: 202,
          clientY: 151,
          pointerId: 1,
        });
        fireEvent.pointerUp(region, {
          clientX: 202,
          clientY: 151,
          pointerId: 1,
        });

        expect(screen.getByRole("status")).toHaveTextContent("Saved");
      });

      it("lets go of the selection on a press where there is no candy", async () => {
        renderBoard([boardQuery(board([2, 1]))]);
        const region = sized(await pile());
        clickCentre(region);
        expect(screen.getByLabelText("Rotate")).toBeEnabled();

        fireEvent.pointerDown(region, {
          clientX: 10,
          clientY: 10,
          pointerId: 1,
        });
        expect(screen.getByLabelText("Rotate")).toBeDisabled();
      });
    });

    it("labels the selected candy's sliders Rotate and Scale", async () => {
      renderBoard([boardQuery(board([2]))]);

      await userEvent.click(within(await pile()).getByRole("img"));
      expect(screen.getByLabelText("Rotate")).toHaveAttribute("type", "range");
      expect(screen.getByLabelText("Scale")).toHaveAttribute("type", "range");
    });

    it("shows corner handles and a rotate handle only on the selected candy", async () => {
      renderBoard([boardQuery(board([2]))]);

      const region = await pile();
      expect(within(region).queryByLabelText(/^Scale from/)).toBeNull();
      await userEvent.click(within(region).getByRole("img"));
      expect(within(region).getAllByLabelText(/^Scale from/)).toHaveLength(4);
      expect(within(region).getByLabelText("Rotate candy")).toBeInTheDocument();
    });

    it("draws the handles above every candy, not only the selected one", async () => {
      renderBoard([boardQuery(board([2, 1]))]);

      const region = await pile();
      // Luther is under the candy corn; its handles must not be.
      const [luther, corn] = within(region).getAllByRole("img");
      await userEvent.click(luther);
      const handle = within(region).getByLabelText("Rotate candy");
      expect(
        frameOf(corn).compareDocumentPosition(handle) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(frameOf(luther).contains(handle)).toBe(false);
    });

    it("scales a candy by dragging a corner away from its centre", async () => {
      renderBoard([boardQuery(board([2]))]);

      // The candy's centre is (200, 150) on a 400 x 300 board.
      const region = sized(await pile());
      const luther = within(region).getByRole("img");
      await userEvent.click(luther);
      const corner = within(region).getByLabelText(
        "Scale from bottom-right corner",
      );
      fireEvent.pointerDown(corner, {
        clientX: 230,
        clientY: 190,
        pointerId: 1,
      });
      fireEvent.pointerMove(region, {
        clientX: 260,
        clientY: 230,
        pointerId: 1,
      });
      fireEvent.pointerUp(region, { clientX: 260, clientY: 230, pointerId: 1 });

      // Twice as far from the centre: twice the scale, 12% wide becomes 24%.
      expect(frameOf(luther).style.width).toBe("24%");
      expect(frameOf(luther).style.left).toBe("50%");
    });

    it("never scales a candy past what the board allows", async () => {
      renderBoard([boardQuery(board([2]))]);

      const region = sized(await pile());
      const luther = within(region).getByRole("img");
      await userEvent.click(luther);
      const corner = within(region).getByLabelText(
        "Scale from top-left corner",
      );
      fireEvent.pointerDown(corner, {
        clientX: 190,
        clientY: 140,
        pointerId: 1,
      });
      fireEvent.pointerMove(region, { clientX: 0, clientY: 0, pointerId: 1 });
      fireEvent.pointerUp(region, { clientX: 0, clientY: 0, pointerId: 1 });

      // At most 4x: 48% wide.
      expect(frameOf(luther).style.width).toBe("48%");
    });

    it("rotates a candy by dragging its rotate handle around the centre", async () => {
      renderBoard([boardQuery(board([2]))]);

      const region = sized(await pile());
      const luther = within(region).getByRole("img");
      await userEvent.click(luther);
      const handle = within(region).getByLabelText("Rotate candy");
      // Straight above the centre is no rotation; straight right is 90.
      fireEvent.pointerDown(handle, {
        clientX: 200,
        clientY: 100,
        pointerId: 1,
      });
      fireEvent.pointerMove(region, {
        clientX: 260,
        clientY: 150,
        pointerId: 1,
      });
      fireEvent.pointerUp(region, { clientX: 260, clientY: 150, pointerId: 1 });

      expect(frameOf(luther).style.transform).toBe(
        "translate(-50%, -50%) rotate(90deg)",
      );
    });

    it("sends changes still waiting when you leave the board", async () => {
      const sent = vi.fn(() => ({
        data: { applyHalloweenCandyBoardActions: board([2, 1]) },
      }));
      const { unmount } = renderBoard([
        boardQuery(board([2])),
        { ...applyMock([ADD_CORN], { board: board([2, 1]) }), result: sent },
      ]);

      await userEvent.click(
        await screen.findByRole("button", {
          name: "Place candy corn (2 left)",
        }),
      );
      unmount();

      await waitFor(() => expect(sent).toHaveBeenCalled());
    });

    it("puts the selected candy back in the tray", async () => {
      renderBoard([boardQuery(board([2]))]);

      const region = await pile();
      await userEvent.click(within(region).getByRole("img"));
      await userEvent.click(
        screen.getByRole("button", { name: "Back to tray" }),
      );

      expect(within(region).queryAllByRole("img")).toHaveLength(0);
      expect(
        screen.getByRole("button", { name: "Place luther head (1 left)" }),
      ).toBeInTheDocument();
    });

    it("offers a link to share", async () => {
      renderBoard([boardQuery(board([]))]);
      expect(
        await screen.findByRole("button", { name: "Copy link" }),
      ).toBeInTheDocument();
    });
  });

  it("says when the event is not running here", () => {
    host.halloweenEnabled = false;
    renderBoard([]);
    expect(
      screen.getByText("Halloween isn't running in this community."),
    ).toBeInTheDocument();
  });
});
