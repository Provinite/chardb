/**
 * The Halloween event's staff page: the win feed, the prize pool, and marking
 * prizes with no chardb item or character as handed over.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { MockedProvider, MockedResponse } from "@apollo/client/testing";
import { ThemeProvider } from "styled-components";
import { lightTheme } from "@chardb/ui";

const COMMUNITY_ID = "11111111-1111-4111-8111-111111111111";

const host = vi.hoisted(() => ({ halloweenEnabled: true }));
const role = vi.hoisted(() => ({ canGrantItems: true, canManageItems: true }));

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

vi.mock("../../hooks/useUserCommunityRole", () => ({
  useUserCommunityRole: () => ({
    loading: false,
    permissions: {
      canGrantItems: role.canGrantItems,
      canManageItems: role.canManageItems,
    },
  }),
}));

vi.mock("react-hot-toast", () => {
  const stub = { success: vi.fn(), error: vi.fn() };
  return { default: stub, toast: stub, Toaster: () => null };
});

import {
  HalloweenDashboardDocument,
  HalloweenPrizeDelivery,
  HalloweenWinFilter,
  HalloweenWinsDocument,
  RemoveHalloweenPrizeDocument,
  SetHalloweenPrizeDeliveredDocument,
} from "../../generated/graphql";
import { CommunityHalloweenAdminPage } from "../CommunityHalloweenAdminPage";

const adopt = {
  __typename: "HalloweenPrizeView" as const,
  id: "adopt",
  name: "Spooky Adopt",
  initialStock: 2,
  currentStock: 1,
  weight: 10,
  image: "https://i.test/adopt.png",
  delivery: HalloweenPrizeDelivery.Staff,
  itemTypeId: null,
  characterId: null,
};

const candy = {
  ...adopt,
  id: "candy",
  name: "Candy Corn",
  initialStock: 5,
  currentStock: 4,
  delivery: HalloweenPrizeDelivery.ChardbItem,
  itemTypeId: "it-1",
};

const win = (overrides: Record<string, unknown>) => ({
  __typename: "HalloweenWin" as const,
  time: "2025-10-10T05:00:00.000Z",
  linkedUser: null,
  deviantArtName: null,
  giftyFromDiscordUserId: null,
  deliveredAt: null,
  deliveredBy: null,
  ...overrides,
});

const adoptWin = win({
  id: 1,
  discordUserId: "200000000000000001",
  deviantArtName: "spooky-fan",
  prize: adopt,
});
const deliveredAdoptWin = win({
  id: 2,
  discordUserId: "200000000000000004",
  prize: adopt,
  deliveredAt: "2025-10-12T05:00:00.000Z",
  deliveredBy: { __typename: "User", id: "u-staff", username: "staffer" },
});
const candyWin = win({
  id: 3,
  discordUserId: "200000000000000002",
  linkedUser: {
    __typename: "User",
    id: "u-linked",
    username: "linkedfan",
    displayName: null,
  },
  giftyFromDiscordUserId: "200000000000000003",
  prize: candy,
});
const unclaimedCandyWin = win({
  id: 4,
  discordUserId: "200000000000000005",
  prize: candy,
});

const dashboard = (toDeliver = 1) => ({
  __typename: "HalloweenDashboard" as const,
  communityId: COMMUNITY_ID,
  guildId: "100000000000000001",
  settings: {
    __typename: "HalloweenEventSettings" as const,
    startDate: "2025-10-01T05:00:00.000Z",
    endDate: "2025-11-01T05:00:00.000Z",
    knocksPerDay: 3,
    resetTime: 6,
    winRate: 0.4,
    winChannel: "300000000000000009",
  },
  summary: {
    __typename: "HalloweenEventSummary" as const,
    knocks: 12,
    wins: 4,
    giftiesSent: 1,
    players: 5,
    toDeliver,
  },
  prizes: [adopt, candy],
});

const dashboardMock = (
  toDeliver = 1,
  overrides: Record<string, unknown> = {},
): MockedResponse => ({
  request: {
    query: HalloweenDashboardDocument,
    variables: { communityId: COMMUNITY_ID },
  },
  result: {
    data: { halloweenDashboard: { ...dashboard(toDeliver), ...overrides } },
  },
});

/** A server whose event has never been set up. */
const notSetUpMock = dashboardMock(0, { settings: null, prizes: [] });

const winsMock = (
  filter: HalloweenWinFilter,
  wins: unknown[],
  { offset = 0, total = wins.length, hasMore = false } = {},
): MockedResponse => ({
  request: {
    query: HalloweenWinsDocument,
    variables: { communityId: COMMUNITY_ID, filter, limit: 50, offset },
  },
  result: {
    data: {
      halloweenWins: {
        __typename: "HalloweenWinPage",
        total,
        hasMore,
        wins,
      },
    },
  },
});

const allWins = winsMock(HalloweenWinFilter.All, [
  unclaimedCandyWin,
  candyWin,
  deliveredAdoptWin,
  adoptWin,
]);

const markDeliveredMock = {
  request: {
    query: SetHalloweenPrizeDeliveredDocument,
    variables: { communityId: COMMUNITY_ID, knockEventId: 1, delivered: true },
  },
  result: vi.fn(() => ({
    data: {
      setHalloweenPrizeDelivered: {
        ...adoptWin,
        deliveredAt: "2025-10-17T05:00:00.000Z",
        deliveredBy: { __typename: "User", id: "u-me", username: "me" },
      },
    },
  })),
};

const renderPage = (mocks: MockedResponse[] = [dashboardMock(), allWins]) =>
  render(<CommunityHalloweenAdminPage />, {
    wrapper: ({ children }) => (
      <MockedProvider mocks={mocks}>
        <MemoryRouter>
          <ThemeProvider theme={lightTheme}>{children}</ThemeProvider>
        </MemoryRouter>
      </MockedProvider>
    ),
  });

describe("CommunityHalloweenAdminPage", () => {
  beforeEach(() => {
    host.halloweenEnabled = true;
    role.canGrantItems = true;
    role.canManageItems = true;
    markDeliveredMock.result.mockClear();
  });

  it("says so when the event is not enabled here", () => {
    host.halloweenEnabled = false;
    renderPage([]);
    expect(
      screen.getByText(/The Halloween event is not enabled for this community/),
    ).toBeInTheDocument();
  });

  it("needs permission to grant or manage items", () => {
    role.canGrantItems = false;
    role.canManageItems = false;
    renderPage([]);
    expect(
      screen.getByText(/needs permission to grant or manage items/),
    ).toBeInTheDocument();
  });

  it("shows the totals and the prize pool", async () => {
    renderPage();
    const summary = await screen.findByTestId("halloween-summary");
    expect(within(summary).getByText("12")).toBeInTheDocument();
    expect(within(summary).getByText("Knocks")).toBeInTheDocument();

    const pool = screen.getByTestId("halloween-prize-pool");
    expect(within(pool).getByText("Spooky Adopt")).toBeInTheDocument();
    expect(within(pool).getByText("1 / 2")).toBeInTheDocument();
    expect(within(pool).getByText("Candy Corn")).toBeInTheDocument();
  });

  it("lists the settings one per line, without seconds", async () => {
    renderPage();
    const settings = await screen.findByTestId("halloween-settings");
    expect(within(settings).getByText("Knocks a day")).toBeInTheDocument();
    expect(within(settings).getByText("3")).toBeInTheDocument();
    expect(within(settings).getByText("Win rate")).toBeInTheDocument();
    expect(within(settings).getByText("40%")).toBeInTheDocument();
    expect(settings.textContent).not.toMatch(/\d:\d\d:\d\d/);
  });

  it("labels each prize's buttons", async () => {
    renderPage();
    const pool = await screen.findByTestId("halloween-prize-pool");
    expect(
      within(pool).getByRole("button", { name: "Edit Spooky Adopt" }),
    ).toHaveTextContent("Edit");
    expect(
      within(pool).getByRole("button", { name: "Remove Spooky Adopt" }),
    ).toHaveTextContent("Remove");
  });

  it("shows which win filter is on", async () => {
    renderPage([
      dashboardMock(),
      allWins,
      winsMock(HalloweenWinFilter.NeedsDelivery, [adoptWin]),
    ]);
    const all = await screen.findByRole("button", { name: /All \(4\)/ });
    const needs = screen.getByRole("button", { name: /Needs delivery/ });
    expect(all).toHaveAttribute("aria-pressed", "true");
    expect(needs).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(needs);
    expect(needs).toHaveAttribute("aria-pressed", "true");
    expect(all).toHaveAttribute("aria-pressed", "false");
  });

  it("names each prize's type", async () => {
    renderPage();
    const pool = await screen.findByTestId("halloween-prize-pool");
    expect(
      within(pool).getByRole("columnheader", { name: "Prize type" }),
    ).toBeInTheDocument();
    expect(within(pool).getByText("Other / off-site")).toBeInTheDocument();
    expect(within(pool).getByText("Item")).toBeInTheDocument();
  });

  it("marks a remove button as destructive", async () => {
    renderPage();
    const pool = await screen.findByTestId("halloween-prize-pool");
    const remove = within(pool).getByRole("button", {
      name: "Remove Spooky Adopt",
    });
    const edit = within(pool).getByRole("button", {
      name: "Edit Spooky Adopt",
    });
    expect(getComputedStyle(remove).backgroundColor).not.toBe(
      getComputedStyle(edit).backgroundColor,
    );
  });

  it("says how each win is being delivered", async () => {
    renderPage();
    const toHand = await screen.findByTestId("halloween-win-1");
    expect(within(toHand).getByText("Staff to deliver")).toBeInTheDocument();
    expect(within(toHand).getByText("spooky-fan")).toBeInTheDocument();

    const done = screen.getByTestId("halloween-win-2");
    expect(within(done).getByText(/Delivered by @staffer/)).toBeInTheDocument();

    const claimed = screen.getByTestId("halloween-win-3");
    expect(
      within(claimed).getByText(/On chardb: @linkedfan/),
    ).toBeInTheDocument();

    const waiting = screen.getByTestId("halloween-win-4");
    expect(
      within(waiting).getByText("Waiting for them to link Discord"),
    ).toBeInTheDocument();
  });

  it("asks the server for the prizes staff still have to hand over", async () => {
    renderPage([
      dashboardMock(),
      allWins,
      winsMock(HalloweenWinFilter.NeedsDelivery, [adoptWin]),
    ]);
    await screen.findByTestId("halloween-win-1");
    await userEvent.click(
      screen.getByRole("button", { name: /Needs delivery \(1\)/ }),
    );
    expect(await screen.findByText(/Showing 1 of 1/)).toBeInTheDocument();
    expect(screen.getByTestId("halloween-win-1")).toBeInTheDocument();
    expect(screen.queryByTestId("halloween-win-3")).not.toBeInTheDocument();
  });

  it("loads more wins a page at a time", async () => {
    renderPage([
      dashboardMock(),
      winsMock(HalloweenWinFilter.All, [unclaimedCandyWin, candyWin], {
        total: 4,
        hasMore: true,
      }),
      winsMock(HalloweenWinFilter.All, [deliveredAdoptWin, adoptWin], {
        offset: 2,
        total: 4,
        hasMore: false,
      }),
    ]);
    await screen.findByTestId("halloween-win-4");
    expect(screen.queryByTestId("halloween-win-1")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Load more/ }));

    expect(await screen.findByTestId("halloween-win-1")).toBeInTheDocument();
    expect(screen.getByTestId("halloween-win-4")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Load more/ }),
    ).not.toBeInTheDocument();
  });

  describe("running the event", () => {
    it("asks for the settings first when the event is not set up", async () => {
      renderPage([notSetUpMock, winsMock(HalloweenWinFilter.All, [])]);
      expect(
        await screen.findByRole("button", { name: "Set up the event" }),
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId("halloween-prize-pool"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Add prize/ }),
      ).not.toBeInTheDocument();
    });

    it("tells someone who cannot set it up that it is not set up", async () => {
      role.canManageItems = false;
      renderPage([notSetUpMock, winsMock(HalloweenWinFilter.All, [])]);
      expect(
        await screen.findByText(/has not been set up yet/),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Set up the event" }),
      ).not.toBeInTheDocument();
    });

    it("lets a manager change the settings", async () => {
      renderPage();
      await userEvent.click(
        await screen.findByRole("button", { name: "Edit settings" }),
      );
      expect(screen.getByTestId("halloween-settings-form")).toBeInTheDocument();
      expect(screen.getByLabelText(/Knocks per day/)).toHaveValue(3);
    });

    it("lets a manager add a prize", async () => {
      renderPage();
      await userEvent.click(
        await screen.findByRole("button", { name: "Add prize" }),
      );
      expect(screen.getByLabelText(/Short name/)).toBeInTheDocument();
    });

    it("lets a manager edit a prize", async () => {
      renderPage();
      const pool = await screen.findByTestId("halloween-prize-pool");
      await userEvent.click(
        within(pool).getByRole("button", { name: "Edit Spooky Adopt" }),
      );
      expect(screen.getByLabelText(/Short name/)).toHaveValue("adopt");
      expect(screen.getByLabelText(/^Stock left/)).toHaveValue(1);
    });

    it("removes a prize after asking", async () => {
      const removed = vi.fn(() => ({ data: { removeHalloweenPrize: true } }));
      renderPage([
        dashboardMock(),
        allWins,
        {
          request: {
            query: RemoveHalloweenPrizeDocument,
            variables: { communityId: COMMUNITY_ID, prizeId: "adopt" },
          },
          result: removed,
        },
        dashboardMock(1, { prizes: [candy] }),
      ]);
      const pool = await screen.findByTestId("halloween-prize-pool");
      await userEvent.click(
        within(pool).getByRole("button", { name: "Remove Spooky Adopt" }),
      );
      await userEvent.click(screen.getByRole("button", { name: "Remove" }));
      await vi.waitFor(() => expect(removed).toHaveBeenCalled());
      await vi.waitFor(() =>
        expect(
          within(pool).queryByText("Spooky Adopt"),
        ).not.toBeInTheDocument(),
      );
    });

    it("shows people who only hand prizes out no way to change the pool", async () => {
      role.canManageItems = false;
      renderPage();
      const pool = await screen.findByTestId("halloween-prize-pool");
      expect(
        screen.queryByRole("button", { name: "Add prize" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Edit settings" }),
      ).not.toBeInTheDocument();
      expect(
        within(pool).queryByRole("button", { name: /Edit|Remove/ }),
      ).not.toBeInTheDocument();
    });

    it("shows people who only manage the pool no Mark delivered", async () => {
      role.canGrantItems = false;
      renderPage();
      const row = await screen.findByTestId("halloween-win-1");
      expect(within(row).getByText("Staff to deliver")).toBeInTheDocument();
      expect(
        within(row).queryByRole("button", { name: /Mark delivered/ }),
      ).not.toBeInTheDocument();
    });
  });

  it("marks a prize delivered and refreshes the count", async () => {
    renderPage([dashboardMock(), allWins, markDeliveredMock, dashboardMock(0)]);
    const row = await screen.findByTestId("halloween-win-1");
    await userEvent.click(
      within(row).getByRole("button", { name: /Mark delivered/ }),
    );
    expect(
      await within(row).findByText(/Delivered by @me/),
    ).toBeInTheDocument();
    expect(markDeliveredMock.result).toHaveBeenCalled();
    expect(
      await screen.findByRole("button", { name: /Needs delivery \(0\)/ }),
    ).toBeInTheDocument();
  });

  it("keeps the delivery buttons out of the status column", async () => {
    renderPage();
    const row = await screen.findByTestId("halloween-win-1");
    expect(
      screen.getAllByRole("columnheader", { name: "Actions" }).length,
    ).toBeGreaterThan(0);
    const [, , , , status, actions] = within(row).getAllByRole("cell");
    expect(status).toHaveTextContent(/^Staff to deliver$/);
    expect(
      within(actions).getByRole("button", { name: /Mark delivered/ }),
    ).toBeInTheDocument();
  });

  it("undoes a delivery only after asking", async () => {
    const undone = vi.fn(() => ({
      data: {
        setHalloweenPrizeDelivered: {
          ...deliveredAdoptWin,
          deliveredAt: null,
          deliveredBy: null,
        },
      },
    }));
    renderPage([
      dashboardMock(),
      allWins,
      {
        request: {
          query: SetHalloweenPrizeDeliveredDocument,
          variables: {
            communityId: COMMUNITY_ID,
            knockEventId: 2,
            delivered: false,
          },
        },
        result: undone,
      },
      dashboardMock(2),
    ]);
    const row = await screen.findByTestId("halloween-win-2");
    await userEvent.click(
      within(row).getByRole("button", { name: "Undo delivered" }),
    );
    expect(undone).not.toHaveBeenCalled();
    expect(
      screen.getByText(/clears who delivered it and when/),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Mark not delivered" }),
    );
    await vi.waitFor(() => expect(undone).toHaveBeenCalled());
    expect(
      await within(row).findByText("Staff to deliver"),
    ).toBeInTheDocument();
  });
});
