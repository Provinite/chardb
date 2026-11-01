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
import { findTooltip } from "../../__tests__/findTooltip";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { MockedProvider, type MockedResponse } from "@apollo/client/testing";
import { GraphQLError } from "graphql";
import { ThemeProvider } from "styled-components";
import { lightTheme } from "@chardb/ui";
import { BOARD_NAME_FIRST_WORDS, BOARD_NAME_LAST_WORDS } from "@chardb/shared";
import * as layerStyles from "../../components/halloween/layers.css";

/**
 * A light or effect layer's value, which it sets as a variable for its class
 * to read: `layer(el, "opacity")`.
 */
const layer = (
  el: HTMLElement | null | undefined,
  name: "backgroundColor" | "opacity" | "blendMode" | "backgroundImage",
) => el?.style.getPropertyValue(layerStyles[name].slice("var(".length, -1));

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

// jsdom cannot draw: the picture's drawing is tested on its own.
const download = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("../../components/halloween/boardImage", async () => ({
  ...(await vi.importActual<
    typeof import("../../components/halloween/boardImage")
  >("../../components/halloween/boardImage")),
  downloadBoardImage: download,
}));

// The nameplate's ribbon is fetched: here it is to hand.
vi.mock("../../components/halloween/ribbon", () => ({
  useRibbon: () => "data:image/png;base64,cmliYm9u",
  loadRibbon: async () => "data:image/png;base64,cmliYm9u",
}));

import {
  ApplyHalloweenCandyBoardActionsDocument,
  HalloweenCandyBoardDocument,
  SetHalloweenCandyBoardBackgroundDocument,
  SetHalloweenCandyBoardLightingDocument,
  SetHalloweenCandyBoardNameDocument,
  type HalloweenCandyBoardAction,
} from "../../generated/graphql";
import { CommunityCandyBoardPage } from "../CommunityCandyBoardPage";
import {
  DEFAULT_LIGHTING,
  shadowFilter,
  spotlightGlow,
  spotlightLayer,
  type Lighting,
} from "../../components/halloween/candyLighting";
import type { BackgroundEffects } from "../../components/halloween/backgroundEffects";
import type { BoardName } from "../../components/halloween/boardName";

const candy = (id: number, slug: string) => ({
  __typename: "HalloweenCandy" as const,
  id,
  slug,
  receivedAt: "2026-10-20T00:00:00.000Z",
});

/** A candy by its knock's id, or the board's nameplate. */
type Ref = number | "nameplate";

const placement = (ref: Ref) => ({
  __typename: "HalloweenCandyPlacement" as const,
  sticker: {
    __typename: "HalloweenSticker" as const,
    candy: ref === "nameplate" ? null : ref,
    nameplate: ref === "nameplate" ? true : null,
  },
  x: 0.5,
  y: 0.5,
  rotation: 0,
  scale: 1,
});

const board = (
  placed: Ref[],
  {
    viewerIsOwner = true,
    owner = "owner" as string | null,
    background = null as string | null,
    lighting = null as Lighting | null,
    backgroundEffects = null as BackgroundEffects | null,
    name = null as BoardName | null,
  } = {},
) => ({
  __typename: "HalloweenCandyBoard" as const,
  name: name && { __typename: "HalloweenCandyBoardName" as const, ...name },
  backgroundEffects: backgroundEffects && {
    __typename: "HalloweenCandyBackgroundEffects" as const,
    ...backgroundEffects,
  },
  lighting: lighting && {
    __typename: "HalloweenCandyLighting" as const,
    ...lighting,
  },
  id: BOARD_ID,
  viewerIsOwner,
  background,
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
  add: { sticker: { candy: 1 }, x: 0.5, y: 0.5, rotation: 0, scale: 1 },
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
    variables: { communityId: COMMUNITY_ID, id: BOARD_ID, actions },
  },
  ...("board" in outcome
    ? { result: { data: { applyHalloweenCandyBoardActions: outcome.board } } }
    : "networkError" in outcome
      ? { error: outcome.networkError }
      : { result: { errors: [new GraphQLError(outcome.graphQLError)] } }),
});

const renderAt = (
  path: string,
  mocks: MockedResponse[],
  /** Beside the page, in its router: a way to another page, say. */
  extra?: React.ReactNode,
) =>
  render(
    <ThemeProvider theme={lightTheme}>
      <MockedProvider mocks={mocks}>
        <MemoryRouter initialEntries={[path]}>
          {extra}
          <Routes>
            <Route
              path="/halloween/board/:boardId"
              element={<CommunityCandyBoardPage />}
            />
          </Routes>
        </MemoryRouter>
      </MockedProvider>
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

  describe("downloading the board as a picture", () => {
    it("draws the board as it is shown, for anyone looking", async () => {
      const name = { first: "Clover", joiner: null, last: "Coin" };
      renderBoard([
        boardQuery(
          board([2], {
            viewerIsOwner: false,
            background: "tile-corkboard",
            name,
          }),
        ),
      ]);
      await userEvent.click(
        await screen.findByRole("button", { name: "Download" }),
      );
      await waitFor(() => expect(download).toHaveBeenCalledTimes(1));
      expect(download).toHaveBeenCalledWith(
        expect.objectContaining({
          background: "tile-corkboard",
          name,
          placements: [expect.objectContaining({ sticker: { candy: 2 } })],
        }),
      );
    });

    it("says so when the picture cannot be made", async () => {
      download.mockRejectedValueOnce(
        new Error("This browser cannot draw the picture"),
      );
      renderBoard([boardQuery(board([2]))]);
      await userEvent.click(
        await screen.findByRole("button", { name: "Download" }),
      );
      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith(
          "This browser cannot draw the picture",
        ),
      );
    });
  });

  describe("the way back to your boards", () => {
    it("is offered to the board's owner", async () => {
      renderBoard([boardQuery(board([2]))]);
      expect(
        await screen.findByRole("link", { name: "Your boards" }),
      ).toHaveAttribute("href", "/halloween/board");
    });

    it("is not offered to anyone else", async () => {
      renderBoard([boardQuery(board([2], { viewerIsOwner: false }))]);
      await pile();
      expect(
        screen.queryByRole("link", { name: "Your boards" }),
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

    it("marks each save state with its own icon", async () => {
      renderBoard([
        boardQuery(board([2])),
        applyMock([ADD_CORN], { board: board([2, 1]) }),
      ]);
      const icon = () =>
        screen
          .getByRole("status")
          .querySelector("[data-save-icon]")
          ?.getAttribute("data-save-icon");

      await screen.findByRole("region", { name: "Your candies" });
      expect(icon()).toBe("saved");

      await userEvent.click(
        screen.getByRole("button", { name: "Place candy corn (2 left)" }),
      );
      expect(icon()).toBe("unsaved");
      await waitFor(() => expect(icon()).toBe("saving"), { timeout: 2000 });
      await waitFor(() => expect(icon()).toBe("saved"), { timeout: 2000 });
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

    it("fetches the board afresh when a save is refused, and says why", async () => {
      renderBoard([
        boardQuery(board([2])),
        applyMock([ADD_CORN], {
          graphQLError: "Too many changes to save at once: at most 100",
        }),
        // Changed meanwhile, elsewhere: neither what loaded nor what this
        // page tried to save.
        boardQuery(board([3])),
      ]);

      await userEvent.click(
        await screen.findByRole("button", {
          name: "Place candy corn (2 left)",
        }),
      );
      await waitFor(
        () =>
          expect(toast.error).toHaveBeenCalledWith(
            "Too many changes to save at once: at most 100",
          ),
        { timeout: 2000 },
      );
      await waitFor(async () =>
        expect(await placedNames()).toEqual(["candy corn"]),
      );
      expect(screen.getByRole("status")).toHaveTextContent("Saved");
    });

    it("saves a candy dragged past the edge where the board shows it", async () => {
      const saved = vi.fn(() => ({
        data: { applyHalloweenCandyBoardActions: board([2]) },
      }));
      renderBoard([
        boardQuery(board([2])),
        {
          ...applyMock([{ edit: { sticker: { candy: 2 }, x: 0, y: 0.5 } }], {
            board: board([2]),
          }),
          result: saved,
        },
      ]);

      const region = sized(await pile());
      // Grabbed 20px right of its centre, then pulled past the left edge:
      // its centre would be off the board, so it stops at the edge.
      fireEvent.pointerDown(region, {
        clientX: 220,
        clientY: 150,
        pointerId: 1,
      });
      fireEvent.pointerMove(region, {
        clientX: -50,
        clientY: 150,
        pointerId: 1,
      });
      fireEvent.pointerUp(region, { clientX: -50, clientY: 150, pointerId: 1 });

      expect(frameOf(within(region).getByRole("img")).style.left).toBe("0%");
      await waitFor(() => expect(saved).toHaveBeenCalled(), { timeout: 2000 });
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
        screen.getByRole("button", { name: "Remove sticker" }),
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
      expect(await findTooltip()).toHaveTextContent("Bring forward");
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

      it("lets go of the selection on a press outside the board and its controls", async () => {
        renderBoard([boardQuery(board([2, 1]))]);
        clickCentre(sized(await pile()));

        fireEvent.pointerDown(screen.getByLabelText("Rotate"), {
          pointerId: 1,
        });
        expect(screen.getByLabelText("Rotate")).toBeEnabled();

        fireEvent.pointerDown(screen.getByRole("heading", { level: 1 }), {
          pointerId: 1,
        });
        expect(screen.getByLabelText("Rotate")).toBeDisabled();
      });
    });

    it("marks the sliders with icons, named Rotate and Scale", async () => {
      renderBoard([boardQuery(board([2]))]);

      await userEvent.click(within(await pile()).getByRole("img"));
      const toolbar = screen.getByLabelText("Selected candy");
      for (const name of ["Rotate", "Scale"]) {
        expect(
          within(toolbar).getByRole("slider", { name }),
        ).toBeInTheDocument();
        expect(within(toolbar).queryByText(name)).toBeNull();
      }
      await userEvent.hover(
        within(toolbar).getByRole("slider", { name: "Rotate" }),
      );
      expect(await findTooltip()).toHaveTextContent("Rotate");
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

    it("keeps a change to one board off another opened straight after", async () => {
      const OTHER = "44444444-4444-4444-8444-444444444444";
      const sent = vi.fn(() => ({
        data: { applyHalloweenCandyBoardActions: board([2, 1]) },
      }));
      const otherQuery: MockedResponse = {
        request: {
          query: HalloweenCandyBoardDocument,
          variables: { communityId: COMMUNITY_ID, id: OTHER },
        },
        result: { data: { halloweenCandyBoard: { ...board([]), id: OTHER } } },
      };
      renderAt(
        `/halloween/board/${OTHER}`,
        [
          otherQuery,
          boardQuery(board([2])),
          { ...applyMock([ADD_CORN], { board: board([2, 1]) }), result: sent },
          // Fetched again on coming back, too slowly to be what shows it.
          { ...otherQuery, delay: 60_000 },
        ],
        <>
          <Link to={`/halloween/board/${BOARD_ID}`}>This board</Link>
          <Link to={`/halloween/board/${OTHER}`}>Another board</Link>
        </>,
      );
      // The other board is seen first, so it is ready at once to come back to.
      await pile();
      await userEvent.click(screen.getByRole("link", { name: "This board" }));

      await userEvent.click(
        await screen.findByRole("button", {
          name: "Place candy corn (2 left)",
        }),
      );
      // Before the change is sent.
      await userEvent.click(
        screen.getByRole("link", { name: "Another board" }),
      );

      // Sent to the board it was made on...
      await waitFor(() => expect(sent).toHaveBeenCalled());
      // ...and nowhere on the board opened after it.
      await waitFor(async () => expect(await placedNames()).toEqual([]));
    });

    it("removes the selected sticker back to the tray", async () => {
      renderBoard([boardQuery(board([2]))]);

      const region = await pile();
      await userEvent.click(within(region).getByRole("img"));
      await userEvent.click(
        screen.getByRole("button", { name: "Remove sticker" }),
      );

      expect(within(region).queryAllByRole("img")).toHaveLength(0);
      expect(
        screen.getByRole("button", { name: "Place luther head (1 left)" }),
      ).toBeInTheDocument();
    });

    it("names the remove button and its key in a tooltip", async () => {
      renderBoard([boardQuery(board([2]))]);

      await userEvent.click(within(await pile()).getByRole("img"));
      const remove = screen.getByRole("button", { name: "Remove sticker" });
      expect(remove.textContent).toBe("");
      await userEvent.hover(remove);
      expect(await findTooltip()).toHaveTextContent("Remove sticker (Delete)");
    });

    it("offers a link to share", async () => {
      renderBoard([boardQuery(board([]))]);
      expect(
        await screen.findByRole("button", { name: "Copy link" }),
      ).toBeInTheDocument();
    });
  });

  describe("the background", () => {
    const setBackground = (
      slug: string | null,
      outcome: { board: ReturnType<typeof board> } | { graphQLError: string },
      effects: BackgroundEffects | null = null,
    ): MockedResponse => ({
      request: {
        query: SetHalloweenCandyBoardBackgroundDocument,
        variables: { communityId: COMMUNITY_ID, id: BOARD_ID, slug, effects },
      },
      result:
        "board" in outcome
          ? { data: { setHalloweenCandyBoardBackground: outcome.board } }
          : { errors: [new GraphQLError(outcome.graphQLError)] },
    });

    /** The board's own surface, which the background is drawn on. */
    const surface = async () => (await pile()).firstElementChild as HTMLElement;

    it("is drawn for anyone looking", async () => {
      renderBoard([
        boardQuery(
          board([], { viewerIsOwner: false, background: "tile-corkboard" }),
        ),
      ]);
      expect((await surface()).style.backgroundImage).toContain(
        "/halloween/backgrounds/tiles/tile-corkboard.webp",
      );
      expect(
        screen.queryByRole("button", { name: "Background" }),
      ).not.toBeInTheDocument();
    });

    /** Opens the background dialog, as the owner. */
    const openDialog = async () => {
      await userEvent.click(
        await screen.findByRole("button", { name: "Background" }),
      );
      return screen.findByRole("dialog", { name: "Background" });
    };
    const preview = (dialog: HTMLElement) =>
      within(dialog).getByRole("img", { name: "Background preview" });

    it("offers every background as a picture alone, the saved one chosen", async () => {
      renderBoard([boardQuery(board([], { background: "tile-corkboard" }))]);
      const dialog = await openDialog();

      const corkboard = within(dialog).getByRole("radio", {
        name: "corkboard",
      });
      expect(corkboard).toBeChecked();
      expect(corkboard.textContent).toBe("");
      expect(
        within(dialog).getByRole("radio", { name: "graph paper" }),
      ).not.toBeChecked();
      expect(
        within(dialog).getByRole("radio", { name: "daphne luther hug" }),
      ).toBeInTheDocument();
      expect(
        within(dialog).queryByRole("radio", { name: "night sky" }),
      ).not.toBeInTheDocument();
    });

    it("is graph paper on a board with none chosen, chosen in the dialog", async () => {
      renderBoard([boardQuery(board([]))]);
      expect((await surface()).style.backgroundImage).toContain(
        "tile-graph-paper.webp",
      );
      const dialog = await openDialog();
      expect(
        within(dialog).getByRole("radio", { name: "graph paper" }),
      ).toBeChecked();
    });

    it("previews a choice without its candies, and leaves the board alone until used", async () => {
      renderBoard([boardQuery(board([2]))]);
      const dialog = await openDialog();

      await userEvent.click(
        within(dialog).getByRole("radio", { name: "corkboard" }),
      );
      expect(preview(dialog).style.backgroundImage).toContain(
        "tile-corkboard.webp",
      );
      expect(within(preview(dialog)).queryAllByRole("img")).toHaveLength(0);
      expect((await surface()).style.backgroundImage).toContain(
        "tile-graph-paper.webp",
      );
    });

    it("saves the choice when used, and closes", async () => {
      const saved = vi.fn(() => ({
        data: {
          setHalloweenCandyBoardBackground: board([], {
            background: "tile-corkboard",
          }),
        },
      }));
      renderBoard([
        boardQuery(board([])),
        {
          ...setBackground("tile-corkboard", { board: board([]) }),
          result: saved,
        },
      ]);
      const dialog = await openDialog();

      await userEvent.click(
        within(dialog).getByRole("radio", { name: "corkboard" }),
      );
      await userEvent.click(
        within(dialog).getByRole("button", { name: "Use background" }),
      );

      expect((await surface()).style.backgroundImage).toContain(
        "tile-corkboard.webp",
      );
      await waitFor(() => expect(saved).toHaveBeenCalled());
      await waitFor(() =>
        expect(
          screen.queryByRole("dialog", { name: "Background" }),
        ).not.toBeInTheDocument(),
      );
    });

    it("changes nothing when cancelled", async () => {
      renderBoard([boardQuery(board([], { background: "tile-corkboard" }))]);
      const dialog = await openDialog();

      await userEvent.click(
        within(dialog).getByRole("radio", { name: "clouds" }),
      );
      await userEvent.click(
        within(dialog).getByRole("button", { name: "Cancel" }),
      );

      expect((await surface()).style.backgroundImage).toContain(
        "tile-corkboard.webp",
      );
    });

    it("goes back to what was saved if the choice is refused", async () => {
      renderBoard([
        boardQuery(board([], { background: "tile-corkboard" })),
        setBackground("tile-clouds", {
          graphQLError: "There is no such background",
        }),
      ]);
      const dialog = await openDialog();

      await userEvent.click(
        within(dialog).getByRole("radio", { name: "clouds" }),
      );
      await userEvent.click(
        within(dialog).getByRole("button", { name: "Use background" }),
      );
      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith("There is no such background"),
      );
      expect((await surface()).style.backgroundImage).toContain(
        "tile-corkboard.webp",
      );
    });

    describe("dimmed and tinted", () => {
      const purple = {
        dim: 0.4,
        tint: "#7c3aed",
        tintStrength: 0.5,
        saturation: 0.9,
      };
      const tintOf = (el: HTMLElement) =>
        el.querySelector<HTMLElement>('[data-testid="background-tint"]');
      const dimOf = (el: HTMLElement) =>
        el.querySelector<HTMLElement>('[data-testid="background-dim"]');

      it("is drawn for anyone looking, under the candies", async () => {
        renderBoard([
          boardQuery(
            board([2], {
              viewerIsOwner: false,
              background: "tile-corkboard",
              backgroundEffects: purple,
            }),
          ),
        ]);
        const s = await surface();
        const tint = tintOf(s);
        const dim = dimOf(s);
        expect(layer(tint, "backgroundColor")).toBe("#7c3aed");
        expect(layer(tint, "opacity")).toBe("0.5");
        expect(layer(tint, "blendMode")).toBe("color");
        expect(layer(dim, "opacity")).toBe("0.4");
        // Drawn before the candies, so they lie over it.
        const candy = within(s).getByRole("img", { name: "luther head" });
        expect(
          dim!.compareDocumentPosition(candy) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
      });

      it("opens on the board's dim and tint", async () => {
        renderBoard([
          boardQuery(
            board([], {
              background: "tile-corkboard",
              backgroundEffects: purple,
            }),
          ),
        ]);
        const dialog = await openDialog();
        expect(within(dialog).getByRole("slider", { name: "Dim" })).toHaveValue(
          "0.4",
        );
        expect(
          within(dialog).getByRole("radio", { name: "Witch purple" }),
        ).toBeChecked();
        expect(
          within(dialog).getByRole("slider", { name: "Tint strength" }),
        ).toHaveValue("0.5");
      });

      it("starts a little desaturated, on the board and in the preview", async () => {
        renderBoard([boardQuery(board([2], { background: "tile-corkboard" }))]);
        const grey = (el: HTMLElement) =>
          el.querySelector<HTMLElement>(
            '[data-testid="background-saturation"]',
          );
        expect(layer(grey(await surface()), "opacity")).toBe("0.1");

        const dialog = await openDialog();
        const saturation = within(dialog).getByRole("slider", {
          name: "Saturation",
        });
        expect(saturation).toHaveValue("0.9");
        fireEvent.change(saturation, { target: { value: "0.25" } });
        expect(layer(grey(preview(dialog)), "opacity")).toBe("0.75");
      });

      it("saves a saturation with the background", async () => {
        const grey = {
          ...purple,
          tint: null,
          tintStrength: 0,
          dim: 0,
          saturation: 0.3,
        };
        const saved = vi.fn(() => ({
          data: {
            setHalloweenCandyBoardBackground: board([], {
              backgroundEffects: grey,
            }),
          },
        }));
        renderBoard([
          boardQuery(board([])),
          { ...setBackground(null, { board: board([]) }, grey), result: saved },
        ]);
        const dialog = await openDialog();
        fireEvent.change(
          within(dialog).getByRole("slider", { name: "Saturation" }),
          { target: { value: "0.3" } },
        );
        await userEvent.click(
          within(dialog).getByRole("button", { name: "Use background" }),
        );
        await waitFor(() => expect(saved).toHaveBeenCalled());
      });

      it("moves its sliders a hundredth at a time", async () => {
        renderBoard([boardQuery(board([]))]);
        const dialog = await openDialog();
        for (const name of ["Dim", "Tint strength", "Saturation"]) {
          expect(within(dialog).getByRole("slider", { name })).toHaveAttribute(
            "step",
            "0.01",
          );
        }
      });

      it("previews a dim and a tint, and saves them with the background", async () => {
        const saved = vi.fn(() => ({
          data: {
            setHalloweenCandyBoardBackground: board([], {
              background: "tile-corkboard",
              backgroundEffects: purple,
            }),
          },
        }));
        renderBoard([
          boardQuery(board([], { background: "tile-corkboard" })),
          {
            ...setBackground("tile-corkboard", { board: board([]) }, purple),
            result: saved,
          },
        ]);
        const dialog = await openDialog();

        fireEvent.change(within(dialog).getByRole("slider", { name: "Dim" }), {
          target: { value: "0.4" },
        });
        await userEvent.click(
          within(dialog).getByRole("radio", { name: "Witch purple" }),
        );
        fireEvent.change(
          within(dialog).getByRole("slider", { name: "Tint strength" }),
          { target: { value: "0.5" } },
        );
        expect(layer(tintOf(preview(dialog)), "opacity")).toBe("0.5");
        expect(layer(dimOf(preview(dialog)), "opacity")).toBe("0.4");
        expect(tintOf(await surface())).toBe(null);

        await userEvent.click(
          within(dialog).getByRole("button", { name: "Use background" }),
        );
        await waitFor(() => expect(saved).toHaveBeenCalled());
        expect(layer(tintOf(await surface()), "opacity")).toBe("0.5");
      });

      it("starts a first tint part way, and lets it go with No tint", async () => {
        renderBoard([boardQuery(board([]))]);
        const dialog = await openDialog();
        const strength = within(dialog).getByRole("slider", {
          name: "Tint strength",
        });
        expect(strength).toBeDisabled();

        await userEvent.click(
          within(dialog).getByRole("radio", { name: "Pumpkin" }),
        );
        expect(strength).toBeEnabled();
        expect(strength).toHaveValue("0.6");

        await userEvent.click(
          within(dialog).getByRole("radio", { name: "No tint" }),
        );
        expect(strength).toBeDisabled();
        expect(tintOf(preview(dialog))).toBe(null);
      });

      it("tints any colour from the custom picker", async () => {
        renderBoard([boardQuery(board([]))]);
        const dialog = await openDialog();

        fireEvent.change(within(dialog).getByLabelText("Custom tint"), {
          target: { value: "#123456" },
        });
        expect(layer(tintOf(preview(dialog)), "backgroundColor")).toBe(
          "#123456",
        );
        expect(
          within(dialog).getByRole("radio", { name: "No tint" }),
        ).not.toBeChecked();
      });
    });
  });

  describe("the lighting", () => {
    const setLighting = (
      lighting: { x: number; y: number; height: number } | null,
      result: ReturnType<typeof board>,
    ): MockedResponse => ({
      request: {
        query: SetHalloweenCandyBoardLightingDocument,
        variables: { communityId: COMMUNITY_ID, id: BOARD_ID, lighting },
      },
      result: { data: { setHalloweenCandyBoardLighting: result } },
    });

    const lutherShadow = async () =>
      within(await pile()).getByRole("img", { name: "luther head" }).style
        .filter;

    const openLighting = async () => {
      await userEvent.click(
        await screen.findByRole("button", { name: "Lighting" }),
      );
      return screen.findByRole("dialog", { name: "Lighting" });
    };

    it("casts each candy's shadow from the board's light, for anyone looking", async () => {
      const light = {
        ...DEFAULT_LIGHTING,
        x: -0.6,
        y: 0,
        height: 0.4,
        intensity: 0.9,
      };
      renderBoard([
        boardQuery(board([2], { viewerIsOwner: false, lighting: light })),
      ]);
      expect(await lutherShadow()).toBe(shadowFilter(light, 0));
      expect(
        screen.queryByRole("button", { name: "Lighting" }),
      ).not.toBeInTheDocument();
    });

    it("colours the whole board with a coloured light, for anyone looking", async () => {
      const light = {
        ...DEFAULT_LIGHTING,
        colour: "#f97316",
        colourStrength: 0.35,
      };
      renderBoard([
        boardQuery(
          board([2], {
            viewerIsOwner: false,
            backgroundEffects: {
              dim: 0.2,
              tint: null,
              tintStrength: 0,
              saturation: 0.9,
            },
            lighting: light,
          }),
        ),
      ]);
      const region = await pile();
      const wash = region.querySelector<HTMLElement>(
        '[data-testid="light-wash"]',
      );
      expect(layer(wash, "backgroundColor")).toBe("#f97316");
      expect(layer(wash, "opacity")).toBe("0.35");
      expect(layer(wash, "blendMode")).toBe("multiply");
      // Over the candies and the background alike.
      const candy = within(region).getByRole("img", { name: "luther head" });
      expect(
        wash!.compareDocumentPosition(candy) & Node.DOCUMENT_POSITION_PRECEDING,
      ).toBeTruthy();
    });

    it("previews a background under the board's light, as the board shows it", async () => {
      const light = {
        ...DEFAULT_LIGHTING,
        colour: "#f97316",
        colourStrength: 0.35,
      };
      renderBoard([boardQuery(board([], { lighting: light }))]);
      await userEvent.click(
        await screen.findByRole("button", { name: "Background" }),
      );
      const dialog = await screen.findByRole("dialog", { name: "Background" });
      const wash = within(dialog)
        .getByRole("img", { name: "Background preview" })
        .querySelector<HTMLElement>('[data-testid="light-wash"]');
      expect(layer(wash, "backgroundColor")).toBe("#f97316");
      expect(layer(wash, "opacity")).toBe("0.35");
    });

    it("darkens the board outside a spotlight's pool, for anyone looking", async () => {
      const light = { ...DEFAULT_LIGHTING, spotlight: 0.6, cone: 0.3 };
      renderBoard([
        boardQuery(board([2], { viewerIsOwner: false, lighting: light })),
      ]);
      const spot = (await pile()).querySelector<HTMLElement>(
        '[data-testid="light-spotlight"]',
      );
      expect(layer(spot, "backgroundImage")).toBe(
        spotlightLayer(light)?.backgroundImage,
      );
      const glow = (await pile()).querySelector<HTMLElement>(
        '[data-testid="light-glow"]',
      );
      expect(layer(glow, "backgroundImage")).toBe(
        spotlightGlow(light)?.backgroundImage,
      );
    });

    it("leaves the board alone under a white light", async () => {
      renderBoard([boardQuery(board([2]))]);
      expect((await pile()).querySelector('[data-testid="light-wash"]')).toBe(
        null,
      );
    });

    it("uses the default light when the board has none", async () => {
      renderBoard([boardQuery(board([2]))]);
      expect(await lutherShadow()).toBe(shadowFilter(null, 0));
    });

    it("moves the light with the keyboard, shows it at once, and saves it", async () => {
      const moved = { ...DEFAULT_LIGHTING, x: -0.1 };
      const saved = vi.fn(() => ({
        data: {
          setHalloweenCandyBoardLighting: board([2], { lighting: moved }),
        },
      }));
      renderBoard([
        boardQuery(board([2])),
        {
          ...setLighting(moved, board([2], { lighting: moved })),
          result: saved,
        },
      ]);
      const dialog = await openLighting();

      (
        await within(dialog).findByRole("group", { name: "Light position" })
      ).focus();
      await userEvent.keyboard("{ArrowLeft}");

      expect(await lutherShadow()).toBe(shadowFilter(moved, 0));
      await waitFor(() => expect(saved).toHaveBeenCalled(), { timeout: 2000 });
    });

    it("raises and lowers the light with its height slider", async () => {
      renderBoard([boardQuery(board([2]))]);
      const dialog = await openLighting();

      fireEvent.change(
        await within(dialog).findByRole("slider", { name: "Light height" }),
        { target: { value: "0.3" } },
      );
      expect(await lutherShadow()).toBe(
        shadowFilter({ ...DEFAULT_LIGHTING, height: 0.3 }, 0),
      );
    });

    it("darkens the shadows with its intensity slider", async () => {
      renderBoard([boardQuery(board([2]))]);
      const dialog = await openLighting();

      fireEvent.change(
        await within(dialog).findByRole("slider", { name: "Light intensity" }),
        { target: { value: "1" } },
      );
      expect(await lutherShadow()).toBe(
        shadowFilter({ ...DEFAULT_LIGHTING, intensity: 1 }, 0),
      );
    });

    it("goes back to the default light", async () => {
      const light = { ...DEFAULT_LIGHTING, x: 0.5, y: 0.5, height: 0.5 };
      const saved = vi.fn(() => ({
        data: { setHalloweenCandyBoardLighting: board([2]) },
      }));
      renderBoard([
        boardQuery(board([2], { lighting: light })),
        { ...setLighting(null, board([2])), result: saved },
      ]);
      const dialog = await openLighting();

      await userEvent.click(
        await within(dialog).findByRole("button", { name: "Default light" }),
      );
      expect(await lutherShadow()).toBe(shadowFilter(null, 0));
      await waitFor(() => expect(saved).toHaveBeenCalled(), { timeout: 2000 });
    });
  });

  describe("the board's name", () => {
    const setName = (
      name: BoardName | null,
      result: ReturnType<typeof board>,
    ): MockedResponse => ({
      request: {
        query: SetHalloweenCandyBoardNameDocument,
        variables: { communityId: COMMUNITY_ID, id: BOARD_ID, name },
      },
      result: { data: { setHalloweenCandyBoardName: result } },
    });
    const moonlit = { first: "Moonlit", joiner: "von", last: "Pumpkin" };

    const openNaming = async () => {
      await userEvent.click(
        await screen.findByRole("button", { name: "Name" }),
      );
      return screen.findByRole("dialog", { name: "Name your board" });
    };

    it("is the board's title, for anyone looking", async () => {
      renderBoard([
        boardQuery(
          board([], { viewerIsOwner: false, owner: "moonbeam", name: moonlit }),
        ),
      ]);
      expect(
        await screen.findByRole("heading", { level: 1 }),
      ).toHaveTextContent("Moonlit von Pumpkin");
      expect(screen.getByText(/moonbeam's board/)).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Name" }),
      ).not.toBeInTheDocument();
    });

    it("leaves an unnamed board's title as it was", async () => {
      renderBoard([boardQuery(board([]))]);
      expect(
        await screen.findByRole("heading", { level: 1 }),
      ).toHaveTextContent("Your candy board");
    });

    it("offers each list of words to pick one from, the saved name picked", async () => {
      renderBoard([boardQuery(board([], { name: moonlit }))]);
      const dialog = await openNaming();

      const first = within(dialog).getByRole("radiogroup", {
        name: "First word",
      });
      expect(within(first).getAllByRole("radio")).toHaveLength(
        BOARD_NAME_FIRST_WORDS.length,
      );
      expect(
        within(first).getByRole("radio", { name: "Moonlit" }),
      ).toBeChecked();
      const joiner = within(dialog).getByRole("radiogroup", { name: "Joiner" });
      expect(within(joiner).getByRole("radio", { name: "von" })).toBeChecked();
      expect(
        within(joiner).getByRole("radio", { name: "No joiner" }),
      ).not.toBeChecked();
      expect(
        within(
          within(dialog).getByRole("radiogroup", { name: "Last word" }),
        ).getByRole("radio", { name: "Pumpkin" }),
      ).toBeChecked();
      expect(within(dialog).getByTestId("name-preview")).toHaveTextContent(
        "Moonlit von Pumpkin",
      );
    });

    it("builds a name word by word, and saves it", async () => {
      const name = { first: "Golden", joiner: null, last: "Hoard" };
      const saved = vi.fn(() => ({
        data: { setHalloweenCandyBoardName: board([], { name }) },
      }));
      renderBoard([
        boardQuery(board([])),
        { ...setName(name, board([], { name })), result: saved },
      ]);
      const dialog = await openNaming();
      const use = within(dialog).getByRole("button", { name: "Use name" });
      expect(use).toBeDisabled();

      await userEvent.click(
        within(dialog).getByRole("radio", { name: "Golden" }),
      );
      expect(use).toBeDisabled();
      await userEvent.click(
        within(dialog).getByRole("radio", { name: "Hoard" }),
      );
      expect(within(dialog).getByTestId("name-preview")).toHaveTextContent(
        "Golden Hoard",
      );
      await userEvent.click(use);

      await waitFor(() => expect(saved).toHaveBeenCalled());
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Golden Hoard",
      );
    });

    it("shuffles a name", async () => {
      renderBoard([boardQuery(board([]))]);
      const dialog = await openNaming();

      await userEvent.click(
        within(dialog).getByRole("button", { name: "Shuffle" }),
      );
      const checked = (group: string) =>
        within(
          within(dialog).getByRole("radiogroup", { name: group }),
        ).getByRole("radio", { checked: true }).textContent;
      const first = checked("First word");
      const joiner = checked("Joiner");
      const last = checked("Last word");
      expect(BOARD_NAME_FIRST_WORDS).toContain(first);
      expect(BOARD_NAME_LAST_WORDS).toContain(last);
      expect(within(dialog).getByTestId("name-preview")).toHaveTextContent(
        [first, joiner === "No joiner" ? null : joiner, last]
          .filter(Boolean)
          .join(" "),
      );
      expect(
        within(dialog).getByRole("button", { name: "Use name" }),
      ).toBeEnabled();
    });

    it("takes a name away", async () => {
      const saved = vi.fn(() => ({
        data: { setHalloweenCandyBoardName: board([]) },
      }));
      renderBoard([
        boardQuery(board([], { name: moonlit })),
        { ...setName(null, board([])), result: saved },
      ]);
      const dialog = await openNaming();
      await userEvent.click(
        within(dialog).getByRole("button", { name: "Remove name" }),
      );
      await waitFor(() => expect(saved).toHaveBeenCalled());
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Your candy board",
      );
    });

    describe("its nameplate", () => {
      const NAMEPLATE = "nameplate";
      const ADD_NAMEPLATE: HalloweenCandyBoardAction = {
        add: {
          sticker: { nameplate: true },
          x: 0.5,
          y: 0.5,
          rotation: 0,
          scale: 1,
        },
      };

      it("waits first in the tray of a named board, and sticks on like a candy", async () => {
        renderBoard([
          boardQuery(board([], { name: moonlit })),
          applyMock([ADD_NAMEPLATE], {
            board: board([NAMEPLATE], { name: moonlit }),
          }),
        ]);
        const tray = await screen.findByRole("region", {
          name: "Your candies",
        });
        const items = within(tray).getAllByRole("button");
        expect(items[0]).toHaveAccessibleName("Place nameplate");

        await userEvent.click(items[0]);
        expect(
          within(await pile()).getByRole("img", {
            name: "Nameplate: Moonlit von Pumpkin",
          }),
        ).toBeInTheDocument();
        expect(
          within(tray).queryByRole("button", { name: "Place nameplate" }),
        ).not.toBeInTheDocument();
      });

      it("shows on the board for anyone looking", async () => {
        renderBoard([
          boardQuery(
            board([NAMEPLATE, 2], { viewerIsOwner: false, name: moonlit }),
          ),
        ]);
        const banner = within(await pile()).getByRole("img", {
          name: "Nameplate: Moonlit von Pumpkin",
        });
        expect(banner.getAttribute("src")).toMatch(/^data:image\/svg\+xml/);
      });

      it("is not offered, nor drawn, while the board has no name", async () => {
        renderBoard([boardQuery(board([NAMEPLATE]))]);
        const tray = await screen.findByRole("region", {
          name: "Your candies",
        });
        expect(
          within(tray).queryByRole("button", { name: "Place nameplate" }),
        ).not.toBeInTheDocument();
        expect(
          within(await pile()).queryByRole("img", { name: /^Nameplate/ }),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("clearing the board", () => {
    it("puts every candy back in the tray once confirmed", async () => {
      const saved = vi.fn(() => ({
        data: { applyHalloweenCandyBoardActions: board([]) },
      }));
      renderBoard([
        boardQuery(board([2, 1])),
        {
          ...applyMock([{ remove: { candy: 2 } }, { remove: { candy: 1 } }], {
            board: board([]),
          }),
          result: saved,
        },
      ]);

      await userEvent.click(
        await screen.findByRole("button", { name: "Clear board" }),
      );
      await userEvent.click(screen.getByRole("button", { name: "Clear" }));

      expect(await placedNames()).toEqual([]);
      expect(
        screen.getByRole("button", { name: "Place candy corn (2 left)" }),
      ).toBeInTheDocument();
      await waitFor(() => expect(saved).toHaveBeenCalled(), { timeout: 2000 });
    });

    it("leaves the board as it is when cancelled", async () => {
      renderBoard([boardQuery(board([2, 1]))]);

      await userEvent.click(
        await screen.findByRole("button", { name: "Clear board" }),
      );
      await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

      expect(await placedNames()).toEqual(["luther head", "candy corn"]);
    });

    it("is not offered with nothing on the board, nor to anyone else", async () => {
      renderBoard([boardQuery(board([]))]);
      expect(
        await screen.findByRole("button", { name: "Clear board" }),
      ).toBeDisabled();
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
