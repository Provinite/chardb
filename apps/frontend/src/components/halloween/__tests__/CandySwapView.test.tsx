/**
 * The candy swap as it is shown: offers to take, the form for making one,
 * your open offers and the trades you have made.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CandySwapView, type CandySwapViewProps } from "../CandySwapView";
import {
  HalloweenCandyOfferStatus,
  type CandySwapActivityFieldsFragment,
  type HalloweenCandyOfferFieldsFragment,
  type HalloweenCandySwapListingFieldsFragment,
  type HalloweenCandySwapTradeFieldsFragment,
  type HalloweenCandyTradeFieldsFragment,
} from "../../../generated/graphql";

const offer = (
  id: string,
  wantSlug: string | null,
  slugs: string[],
  host: string | null = null,
): HalloweenCandyOfferFieldsFragment => ({
  id,
  wantSlug,
  status: HalloweenCandyOfferStatus.Open,
  host,
  createdAt: "2026-10-31T12:00:00.000Z",
  candies: slugs.map((slug, i) => ({ id: i + 100, slug })),
});

/** An offer in the market, takeable unless said otherwise. */
const take = (
  o: HalloweenCandyOfferFieldsFragment,
  canTake = true,
): HalloweenCandySwapListingFieldsFragment => ({ canTake, offer: o });

const NOW = new Date("2026-10-31T12:30:00.000Z");

/** How busy the swap is; nothing open unless said otherwise. */
const activity = (
  over: Partial<CandySwapActivityFieldsFragment> = {},
): CandySwapActivityFieldsFragment => ({
  openOffers: 0,
  tradesLastDay: 0,
  available: 0,
  readyToTrade: 0,
  ...over,
});

const swap = (
  over: Partial<HalloweenCandySwapTradeFieldsFragment> = {},
): HalloweenCandySwapTradeFieldsFragment => ({
  id: "s1",
  host: null,
  offered: ["candy-corn", "berry-tart"],
  paid: ["banana"],
  createdAt: "2026-10-31T12:25:00.000Z",
  offerer: { id: "u-alice", username: "alice", displayName: "Alice" },
  taker: { id: "u-bob", username: "bob", displayName: null },
  ...over,
});

const trade: HalloweenCandyTradeFieldsFragment = {
  id: "t1",
  with: { id: "u-bob", username: "bob", displayName: "Bob" },
  host: null,
  gave: ["candy-corn"],
  received: ["banana", "berry-tart"],
  createdAt: "2026-10-31T12:00:00.000Z",
};

const renderView = (props: Partial<CandySwapViewProps> = {}) => {
  const handlers = {
    onPlace: vi.fn().mockResolvedValue(true),
    onAccept: vi.fn(),
    onCancel: vi.fn(),
    onReroll: vi.fn(),
    onRetryRecent: vi.fn(),
  };
  const view = (over: Partial<CandySwapViewProps>) => (
    <CandySwapView
      candyTypes={["banana", "berry-tart", "candy-corn", "luther-head"]}
      myCandies={[
        { id: 1, slug: "candy-corn" },
        { id: 2, slug: "candy-corn" },
        { id: 3, slug: "banana" },
      ]}
      listings={[]}
      activity={activity()}
      recentTrades={[]}
      marketFailed={false}
      recentFailed={false}
      now={NOW}
      myOffers={[]}
      trades={[]}
      maxOpenOffers={10}
      maxOffered={3}
      placing={false}
      acceptingId={null}
      cancellingId={null}
      rerolling={false}
      {...handlers}
      {...over}
    />
  );
  const { rerender } = render(view(props));
  return {
    ...handlers,
    /** Renders again with these props in place of the first ones. */
    update: (next: Partial<CandySwapViewProps>) => rerender(view(next)),
  };
};

const section = (name: string) => screen.getByRole("region", { name });

/** Opens the picker from the offer form and picks a candy by name. */
const askFor = async (
  form: HTMLElement,
  name: string,
  opener = "Choose a candy to ask for",
) => {
  await userEvent.click(within(form).getByRole("button", { name: opener }));
  const picker = screen.getByRole("dialog", { name: "Ask for a candy" });
  // The name alone, or with how many you have after it.
  await userEvent.click(
    within(picker).getByRole("button", {
      name: (n) => n === name || n.startsWith(`${name} (`),
    }),
  );
};

describe("CandySwapView", () => {
  describe("offers to take", () => {
    it("shows what each offer gives and wants, and takes it", async () => {
      const { onAccept } = renderView({
        listings: [take(offer("o1", "banana", ["luther-head", "berry-tart"]))],
      });

      const offers = section("Open offers");
      const card = within(offers).getByRole("listitem");
      expect(
        within(card).getByRole("img", { name: "luther head" }),
      ).toBeInTheDocument();
      expect(
        within(card).getByRole("img", { name: "berry tart" }),
      ).toBeInTheDocument();
      // In the terms, and again on the button.
      expect(within(card).getAllByRole("img", { name: "banana" })).toHaveLength(
        2,
      );
      // Pictures only: the names are for screen readers.
      expect(within(card).queryByText("luther head")).toBeNull();

      // The candy it costs shows as its picture, like everywhere else.
      const give = within(card).getByRole("button", { name: "Give banana" });
      expect(
        within(give).getByRole("img", { name: "banana" }),
      ).toBeInTheDocument();
      await userEvent.click(give);
      expect(onAccept).toHaveBeenCalledWith("o1");
    });

    it("takes an offer for anything with the candy you pick", async () => {
      const { onAccept } = renderView({
        listings: [take(offer("o1", null, ["luther-head"]))],
      });
      const card = within(section("Open offers")).getByRole("listitem");
      expect(
        within(card).getByRole("img", { name: "anything" }),
      ).toBeInTheDocument();

      await userEvent.click(
        within(card).getByRole("button", { name: "Pick a candy to trade" }),
      );
      const picker = screen.getByRole("dialog", { name: "Trade a candy" });
      expect(
        within(picker).getByRole("button", { name: "banana (you have 1)" }),
      ).toBeEnabled();
      await userEvent.click(
        within(picker).getByRole("button", {
          name: "candy corn (you have 2)",
        }),
      );

      expect(onAccept).toHaveBeenCalledWith("o1", "candy-corn");
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("will not trade a kind an offer for anything gives", async () => {
      renderView({ listings: [take(offer("o1", null, ["banana"]))] });
      const card = within(section("Open offers")).getByRole("listitem");
      await userEvent.click(
        within(card).getByRole("button", { name: "Pick a candy to trade" }),
      );
      const picker = screen.getByRole("dialog", { name: "Trade a candy" });
      expect(
        within(picker).getByRole("button", { name: "banana (you have 1)" }),
      ).toBeDisabled();
    });

    it("trades at once from the candy picked, rather than toggling it", async () => {
      renderView({ listings: [take(offer("o1", null, ["luther-head"]))] });
      const card = within(section("Open offers")).getByRole("listitem");
      await userEvent.click(
        within(card).getByRole("button", { name: "Pick a candy to trade" }),
      );
      const picker = screen.getByRole("dialog", { name: "Trade a candy" });
      for (const button of within(picker).getAllByRole("button", {
        name: /you have/,
      })) {
        expect(button).not.toHaveAttribute("aria-pressed");
      }
    });

    it("lists your candies in the same order as the candy types", async () => {
      renderView({
        candyTypes: ["candy-corn", "banana", "berry-tart", "luther-head"],
        listings: [take(offer("o1", null, ["luther-head"]))],
      });
      const card = within(section("Open offers")).getByRole("listitem");
      await userEvent.click(
        within(card).getByRole("button", { name: "Pick a candy to trade" }),
      );
      const picker = screen.getByRole("dialog", { name: "Trade a candy" });
      expect(
        within(picker)
          .getAllByRole("button", { name: /you have/ })
          .map((b) => b.getAttribute("aria-label")),
      ).toEqual(["candy corn (you have 2)", "banana (you have 1)"]);
    });

    it("says when no one else has an offer open", () => {
      renderView({ listings: [] });
      expect(
        within(section("Open offers")).getByText(
          "No one else has an open offer right now",
        ),
      ).toBeInTheDocument();
    });

    it("keeps the place of the count and shuffle while the offers load", () => {
      renderView({ listings: null, activity: null });
      // There, but hidden from screen readers until there is something to say.
      const row = within(section("Open offers"))
        .getByText("Shuffle")
        .closest("[aria-hidden]");
      expect(row).toHaveAttribute("aria-hidden", "true");
      expect(
        within(row as HTMLElement)
          .getByText("Shuffle")
          .closest("button"),
      ).toBeDisabled();
    });

    it("says when the offers could not be loaded, and tries again", async () => {
      const { onReroll } = renderView({
        listings: null,
        activity: null,
        marketFailed: true,
      });
      const offers = section("Open offers");
      expect(
        within(offers).getByText("Couldn't load the open offers."),
      ).toBeInTheDocument();
      await userEvent.click(
        within(offers).getByRole("button", { name: "Try again" }),
      );
      expect(onReroll).toHaveBeenCalled();
    });

    it("goes back to all the offers once none are left to take", async () => {
      const listings = [
        take(offer("yes", "banana", ["luther-head"])),
        take(offer("no", "skull-candy", ["candy-corn"]), false),
      ];
      const { update } = renderView({
        listings,
        activity: activity({ available: 2, readyToTrade: 1 }),
      });
      const offers = section("Open offers");
      await userEvent.click(
        within(offers).getByRole("button", { name: "All (2)" }),
      );
      await userEvent.click(
        within(offers).getByRole("button", { name: "Ready to trade (1)" }),
      );

      // The one you could take has gone.
      update({
        listings: [listings[1]],
        activity: activity({ available: 1, readyToTrade: 0 }),
      });

      expect(
        within(offers).getByRole("button", { name: "All (1)" }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(within(offers).getAllByRole("listitem")).toHaveLength(1);
    });

    it("says how many of all the offers it shows, and shuffles in others", async () => {
      const { onReroll } = renderView({
        listings: [
          take(offer("o1", "banana", ["luther-head"])),
          take(offer("o2", "skull-candy", ["candy-corn"]), false),
        ],
        activity: activity({ available: 312, readyToTrade: 1 }),
      });
      const offers = section("Open offers");
      await userEvent.click(
        within(offers).getByRole("button", { name: /^All/ }),
      );
      expect(within(offers).getByText("Showing 2 of 312")).toBeInTheDocument();

      await userEvent.click(
        within(offers).getByRole("button", { name: "Shuffle" }),
      );
      expect(onReroll).toHaveBeenCalled();
    });

    it("cannot shuffle when every offer is showing", () => {
      renderView({
        listings: [take(offer("o1", "banana", ["luther-head"]))],
        activity: activity({ available: 1, readyToTrade: 1 }),
      });
      const offers = section("Open offers");
      expect(within(offers).getByText("Showing 1 of 1")).toBeInTheDocument();
      expect(
        within(offers).getByRole("button", { name: "Shuffle" }),
      ).toBeDisabled();
    });

    it("shows only the offers you can take, until asked for all", async () => {
      renderView({
        listings: [
          take(offer("yes", "banana", ["luther-head"])),
          take(offer("no", "skull-candy", ["candy-corn"]), false),
        ],
        activity: activity({ available: 312, readyToTrade: 40 }),
      });
      const offers = section("Open offers");
      expect(within(offers).getAllByRole("listitem")).toHaveLength(1);
      // Counts every offer there is, not only those on screen.
      expect(
        within(offers).getByRole("button", { name: "Ready to trade (40)" }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(within(offers).getByText("Showing 1 of 40")).toBeInTheDocument();

      await userEvent.click(
        within(offers).getByRole("button", { name: "All (312)" }),
      );
      expect(within(offers).getAllByRole("listitem")).toHaveLength(2);
    });

    it("shows them all when you can take none", () => {
      renderView({
        listings: [take(offer("no", "skull-candy", ["candy-corn"]), false)],
        activity: activity({ available: 1, readyToTrade: 0 }),
      });
      const offers = section("Open offers");
      expect(
        within(offers).getByRole("button", { name: "Ready to trade (0)" }),
      ).toBeDisabled();
      expect(
        within(offers).getByRole("button", { name: "All (1)" }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(within(offers).getAllByRole("listitem")).toHaveLength(1);
    });

    it("says what an offer you cannot take wants", () => {
      renderView({
        listings: [
          take(offer("no", "skull-candy", ["candy-corn"]), false),
          take(offer("any", null, ["candy-corn"]), false),
        ],
      });
      const [named, anything] = within(section("Open offers")).getAllByRole(
        "listitem",
      );
      // A picture of the candy in the sentence, not its name.
      expect(within(named).queryByRole("button")).toBeNull();
      expect(within(named).getByText(/You don't have any/)).toHaveTextContent(
        "You don't have any to trade",
      );
      expect(
        within(named).getAllByRole("img", { name: "skull candy" }),
      ).toHaveLength(2);
      expect(within(named).queryByText(/skull candy/)).toBeNull();
      expect(within(anything).queryByRole("button")).toBeNull();
      expect(
        within(anything).getByText("You have no candy it doesn't already give"),
      ).toBeInTheDocument();
    });
  });

  it("says how busy the swap is", () => {
    renderView({ activity: activity({ openOffers: 42, tradesLastDay: 1 }) });
    const stat = (text: string) =>
      screen.getByText(
        (_, el) => el?.tagName === "P" && el.textContent === text,
      );
    expect(stat("42 open offers")).toBeInTheDocument();
    expect(stat("1 trade in the last day")).toBeInTheDocument();
  });

  describe("recent swaps", () => {
    it("names both sides, and shows what changed hands and when", () => {
      renderView({ recentTrades: [swap()] });
      const row = within(section("Recent swaps")).getByRole("listitem");
      expect(within(row).getByText("Alice")).toBeInTheDocument();
      expect(within(row).getByText("bob")).toBeInTheDocument();
      expect(
        within(row).getByRole("img", { name: "berry tart" }),
      ).toBeInTheDocument();
      expect(
        within(row).getByRole("img", { name: "banana" }),
      ).toBeInTheDocument();
      expect(within(row).getByText("5 minutes ago")).toBeInTheDocument();
    });

    it("names the host of a house offer, and a deleted account", () => {
      renderView({
        recentTrades: [swap({ offerer: null, host: "Daphne", taker: null })],
      });
      const row = within(section("Recent swaps")).getByRole("listitem");
      expect(within(row).getByText("Daphne")).toBeInTheDocument();
      expect(within(row).getByText("A deleted account")).toBeInTheDocument();
    });

    it("says when there are none", () => {
      renderView({ recentTrades: [] });
      expect(
        within(section("Recent swaps")).getByText("No swaps yet."),
      ).toBeInTheDocument();
    });

    it("says when they could not be loaded, and tries again", async () => {
      const { onRetryRecent } = renderView({
        recentTrades: null,
        recentFailed: true,
      });
      const feed = section("Recent swaps");
      expect(
        within(feed).getByText("Couldn't load the recent swaps."),
      ).toBeInTheDocument();
      await userEvent.click(
        within(feed).getByRole("button", { name: "Try again" }),
      );
      expect(onRetryRecent).toHaveBeenCalled();
    });
  });

  describe("making an offer", () => {
    it("offers the candies picked for the kind asked for", async () => {
      const { onPlace } = renderView();
      const form = section("Make an offer");

      await userEvent.click(
        within(form).getByRole("button", { name: "Add candy corn (2 left)" }),
      );
      await userEvent.click(
        within(form).getByRole("button", { name: "Add candy corn (1 left)" }),
      );
      await askFor(form, "luther head");
      await userEvent.click(
        within(form).getByRole("button", { name: "Place offer" }),
      );

      expect(onPlace).toHaveBeenCalledWith([1, 2], "luther-head");
    });

    it("picks the candy asked for from pictures, and closes", async () => {
      renderView();
      const form = section("Make an offer");

      await userEvent.click(
        within(form).getByRole("button", { name: "Choose a candy to ask for" }),
      );
      const picker = screen.getByRole("dialog", { name: "Ask for a candy" });
      // Pictures only: the names are for screen readers.
      expect(within(picker).queryByText("luther head")).toBeNull();
      await userEvent.click(
        within(picker).getByRole("button", { name: "luther head" }),
      );

      expect(screen.queryByRole("dialog")).toBeNull();
      expect(
        within(form).getByRole("button", { name: "Asking for luther head" }),
      ).toBeInTheDocument();
      expect(within(form).queryByText("luther head")).toBeNull();
    });

    it("marks the candy already asked for", async () => {
      renderView();
      const form = section("Make an offer");
      await askFor(form, "berry tart");
      await userEvent.click(
        within(form).getByRole("button", { name: "Asking for berry tart" }),
      );
      const picker = screen.getByRole("dialog", { name: "Ask for a candy" });
      expect(
        within(picker).getByRole("button", { name: "berry tart" }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(
        within(picker).getByRole("button", { name: "banana (you have 1)" }),
      ).toHaveAttribute("aria-pressed", "false");
    });

    it("focuses the candy already asked for when reopened", async () => {
      renderView();
      const form = section("Make an offer");
      await askFor(form, "berry tart");
      await userEvent.click(
        within(form).getByRole("button", { name: "Asking for berry tart" }),
      );
      const picker = screen.getByRole("dialog", { name: "Ask for a candy" });
      expect(
        within(picker).getByRole("button", { name: "berry tart" }),
      ).toHaveFocus();
    });

    it("stops asking when the candy asked for is picked again", async () => {
      renderView();
      const form = section("Make an offer");
      await askFor(form, "banana");
      expect(
        within(form).getByRole("button", { name: "Add banana (1 left)" }),
      ).toBeDisabled();
      await askFor(form, "banana", "Asking for banana");
      expect(
        within(form).getByRole("button", { name: "Choose a candy to ask for" }),
      ).toBeInTheDocument();
      expect(
        within(form).getByRole("button", { name: "Add banana (1 left)" }),
      ).toBeEnabled();
    });

    it("counts candies held in your open offers as yours", async () => {
      renderView({ myOffers: [offer("mine", "banana", ["luther-head"])] });
      const form = section("Make an offer");
      await userEvent.click(
        within(form).getByRole("button", { name: "Choose a candy to ask for" }),
      );
      const picker = screen.getByRole("dialog", { name: "Ask for a candy" });
      expect(
        within(picker).getByRole("button", {
          name: "luther head (you have 1)",
        }),
      ).toBeInTheDocument();
    });

    it("shows how many of each candy you have", async () => {
      renderView();
      const form = section("Make an offer");
      await userEvent.click(
        within(form).getByRole("button", { name: "Choose a candy to ask for" }),
      );
      const picker = screen.getByRole("dialog", { name: "Ask for a candy" });
      const corn = within(picker).getByRole("button", {
        name: "candy corn (you have 2)",
      });
      expect(within(corn).getByText("2")).toBeInTheDocument();
      expect(
        within(picker).getByRole("button", { name: "luther head" }),
      ).toBeInTheDocument();
    });

    it("takes a picked candy back off the offer", async () => {
      renderView();
      const form = section("Make an offer");
      await userEvent.click(
        within(form).getByRole("button", { name: "Add banana (1 left)" }),
      );
      await userEvent.click(
        within(form).getByRole("button", { name: "Remove banana" }),
      );
      expect(
        within(form).getByRole("button", { name: "Add banana (1 left)" }),
      ).toBeEnabled();
    });

    it("gives at most three candies", async () => {
      renderView({
        myCandies: [1, 2, 3, 4].map((id) => ({ id, slug: "candy-corn" })),
      });
      const form = section("Make an offer");
      for (const left of [4, 3, 2]) {
        await userEvent.click(
          within(form).getByRole("button", {
            name: `Add candy corn (${left} left)`,
          }),
        );
      }
      expect(
        within(form).getByRole("button", { name: "Add candy corn (1 left)" }),
      ).toBeDisabled();
    });

    it("gives as many candies as the swap allows", async () => {
      renderView({ maxOffered: 1 });
      const form = section("Make an offer");
      await userEvent.click(
        within(form).getByRole("button", { name: "Add banana (1 left)" }),
      );
      expect(
        within(form).getByRole("button", { name: "Add candy corn (2 left)" }),
      ).toBeDisabled();
    });

    it("says where candies come from when there are none to offer", () => {
      renderView({
        myCandies: [],
        noCandies: <a href="/profile/edit">Link your Discord account</a>,
      });
      const form = section("Make an offer");
      expect(
        within(form).getByRole("link", { name: "Link your Discord account" }),
      ).toHaveAttribute("href", "/profile/edit");
    });

    it("will not ask for a kind it gives", async () => {
      renderView();
      const form = section("Make an offer");
      await userEvent.click(
        within(form).getByRole("button", { name: "Add banana (1 left)" }),
      );
      await userEvent.click(
        within(form).getByRole("button", { name: "Choose a candy to ask for" }),
      );
      const picker = screen.getByRole("dialog", { name: "Ask for a candy" });
      expect(
        within(picker).getByRole("button", { name: "banana (you have 1)" }),
      ).toBeDisabled();
    });

    it("needs a candy and a kind to ask for", async () => {
      renderView();
      const form = section("Make an offer");
      expect(
        within(form).getByRole("button", { name: "Place offer" }),
      ).toBeDisabled();
    });

    it("asks for anything", async () => {
      const { onPlace } = renderView();
      const form = section("Make an offer");
      await userEvent.click(
        within(form).getByRole("button", { name: "Add banana (1 left)" }),
      );
      await askFor(form, "Anything");
      expect(
        within(form).getByRole("button", { name: "Asking for anything" }),
      ).toBeInTheDocument();
      await userEvent.click(
        within(form).getByRole("button", { name: "Place offer" }),
      );
      expect(onPlace).toHaveBeenCalledWith([3], null);
    });

    it("stops at the most open offers", () => {
      renderView({
        maxOpenOffers: 1,
        myOffers: [offer("mine", "banana", ["candy-corn"])],
      });
      const form = section("Make an offer");
      expect(
        within(form).getByRole("button", { name: "Place offer" }),
      ).toBeDisabled();
      expect(
        within(form).getByText(
          "1 open offer is the most you can have. Cancel one to make another.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("names an offer for anything by what it asks for", () => {
    renderView({ myOffers: [offer("mine", null, ["candy-corn"])] });
    const mine = section("Your open offers");
    expect(
      within(mine).getByRole("button", { name: "Cancel offer for anything" }),
    ).toBeInTheDocument();
    expect(
      within(mine).getByRole("img", { name: "anything" }),
    ).toBeInTheDocument();
  });

  it("counts your open offers against the most you can have", () => {
    renderView({ myOffers: [offer("mine", "banana", ["candy-corn"])] });
    expect(
      within(section("Your open offers")).getByText("1 of 10"),
    ).toBeInTheDocument();
  });

  it("lists your open offers, each cancellable", async () => {
    const { onCancel } = renderView({
      myOffers: [offer("mine", "banana", ["candy-corn"])],
    });
    const mine = section("Your open offers");
    await userEvent.click(
      within(mine).getByRole("button", {
        name: "Cancel offer for banana",
      }),
    );
    expect(onCancel).toHaveBeenCalledWith("mine");
  });

  it("shows whom each trade was with, and what changed hands", () => {
    renderView({ trades: [trade] });
    const history = section("Your trades");
    const row = within(history).getByRole("listitem");
    expect(within(row).getByText("Bob")).toBeInTheDocument();
    expect(
      within(row).getByRole("img", { name: "candy corn" }),
    ).toBeInTheDocument();
    expect(
      within(row).getByRole("img", { name: "banana" }),
    ).toBeInTheDocument();
  });

  it("names the host a house trade was with", () => {
    renderView({
      trades: [{ ...trade, with: null, host: "Luther" }],
    });
    const row = within(section("Your trades")).getByRole("listitem");
    expect(within(row).getByText("Luther")).toBeInTheDocument();
    expect(within(row).queryByText("A deleted account")).toBeNull();
  });

  it("names the host on a house offer", () => {
    renderView({
      listings: [
        take(
          offer(
            "h1",
            "skull-candy",
            ["banana", "berry-tart", "candy-corn"],
            "Daphne",
          ),
        ),
        take(offer("p1", "banana", ["luther-head"])),
      ],
    });
    const [house, player] = within(section("Open offers")).getAllByRole(
      "listitem",
    );
    expect(within(house).getByText("Daphne's offer")).toBeInTheDocument();
    expect(within(player).queryByText(/'s offer$/)).toBeNull();
  });
});
