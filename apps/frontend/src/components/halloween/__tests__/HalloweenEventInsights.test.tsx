import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  HalloweenEventStats,
  HalloweenRunOutForecast,
  HalloweenSimulators,
} from "../HalloweenEventInsights";

const period = (players: number, knocks: number, giftySenders: number) => ({
  players,
  knocks,
  wins: 0,
  giftiesSent: giftySenders,
  giftySenders,
});

const prizes = [
  {
    id: "adopt",
    name: "Spooky Adopt",
    initialStock: 3,
    currentStock: 2,
    weight: 10,
    image: null,
  },
  {
    id: "candy",
    name: "Candy Corn",
    initialStock: 7,
    currentStock: 0,
    weight: 10,
    image: null,
  },
];

const statValue = (label: string) =>
  within(screen.getByTestId("halloween-summary"))
    .getByText(label)
    .closest("li")
    ?.querySelector("p")?.textContent;

describe("HalloweenEventStats", () => {
  it("shows stock, players and the share of players sending gifties", () => {
    render(
      <HalloweenEventStats
        prizes={prizes}
        summary={{
          knocks: 30,
          wins: 2,
          players: 12,
          giftiesSent: 5,
          toDeliver: 1,
          unspentGifties: 4,
          last24Hours: period(8, 20, 3),
          today: period(4, 10, 1),
          yesterday: null,
        }}
      />,
    );
    expect(statValue("Prizes at start")).toBe("10");
    expect(statValue("Prizes left")).toBe("2");
    expect(statValue("Players, last 24h")).toBe("8");
    expect(statValue("Players, all time")).toBe("12");
    expect(statValue("Gifties unspent")).toBe("4");
    expect(statValue("Sent a gifty today")).toBe("25%");
    expect(statValue("Sent a gifty yesterday")).toBe("–");
  });
});

describe("HalloweenSimulators", () => {
  it("draws only prizes with stock left", async () => {
    render(
      <HalloweenSimulators prizes={prizes} winRate={0} candySlugs={["x"]} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Draw a prize" }));
    expect(screen.getByText("Spooky Adopt")).toBeInTheDocument();
  });

  it("loses every knock at a win rate of 0, with a candy", async () => {
    render(
      <HalloweenSimulators
        prizes={prizes}
        winRate={0}
        candySlugs={["candy-corn"]}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Knock" }));
    expect(screen.getByText("No one was home")).toBeInTheDocument();
    expect(screen.getByText("Candy corn")).toBeInTheDocument();
  });
});

describe("HalloweenRunOutForecast", () => {
  const forecast = (winRate: number, startDate: string | null = null) =>
    render(
      <HalloweenRunOutForecast
        prizes={prizes}
        winRate={winRate}
        knocksPerDay={3}
        // 2 players knocking 2 times: 4 knocks a day.
        last24Hours={period(2, 4, 0)}
        yesterday={null}
        startDate={startDate}
        endDate="2025-10-16T17:00:00.000Z"
        now={new Date("2025-10-15T17:00:00.000Z")}
      />,
    );

  it("counts no knocks before the event starts", () => {
    // Starts half a day from now; the prizes go half a day after that.
    forecast(1, "2025-10-16T05:00:00.000Z");
    const summary = screen.getByTestId("halloween-forecast-summary");
    expect(within(summary).getByText(/Median: 1\.0 days/)).toBeInTheDocument();
  });

  it("assumes gifties sent per player on top of the daily knocks, before anyone knocks", () => {
    render(
      <HalloweenRunOutForecast
        prizes={prizes}
        winRate={1}
        knocksPerDay={3}
        last24Hours={period(0, 0, 0)}
        // 2 of 10 players sent 5 gifties: half a knock more each.
        yesterday={{ ...period(10, 30, 2), giftiesSent: 5 }}
        startDate={null}
        endDate={null}
        now={new Date("2025-10-15T17:00:00.000Z")}
      />,
    );
    expect(screen.getByLabelText("Knocks per player a day")).toHaveValue(
      "3.50",
    );
  });

  it("runs out on schedule when every knock wins", () => {
    forecast(1);
    // Two prizes at four wins a day: half a day, before the end a day away.
    const summary = screen.getByTestId("halloween-forecast-summary");
    expect(within(summary).getByText(/Median: 0\.5 days/)).toBeInTheDocument();
    expect(
      within(summary).getByText(
        "Runs out before the scheduled end (1.0 days): 100%",
      ),
    ).toBeInTheDocument();
  });

  it("starts from the last 24 hours, and takes a what-if win rate", async () => {
    forecast(1);
    expect(screen.getByLabelText("Players a day")).toHaveValue("2");
    expect(screen.getByLabelText("Knocks per player a day")).toHaveValue(
      "2.00",
    );
    const rate = screen.getByLabelText("Win rate (%)");
    await userEvent.clear(rate);
    await userEvent.type(rate, "0");
    expect(
      screen.getByText("Never: no wins or no knocks at these numbers"),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(rate).toHaveValue("100");
  });
});
