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
const role = vi.hoisted(() => ({ canGrantItems: true }));

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
    permissions: { canGrantItems: role.canGrantItems },
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

const dashboardMock = (toDeliver = 1): MockedResponse => ({
  request: {
    query: HalloweenDashboardDocument,
    variables: { communityId: COMMUNITY_ID },
  },
  result: { data: { halloweenDashboard: dashboard(toDeliver) } },
});

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
    markDeliveredMock.result.mockClear();
  });

  it("says so when the event is not enabled here", () => {
    host.halloweenEnabled = false;
    renderPage([]);
    expect(
      screen.getByText(/The Halloween event is not enabled for this community/),
    ).toBeInTheDocument();
  });

  it("needs permission to grant items", () => {
    role.canGrantItems = false;
    renderPage([]);
    expect(
      screen.getByText(/needs permission to grant items/),
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
});
