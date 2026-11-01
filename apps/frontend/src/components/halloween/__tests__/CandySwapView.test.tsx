/**
 * The candy swap as it is shown: offers to take, the form for making one,
 * your open offers and the trades you have made.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  CandySwapView,
  type CandySwapViewProps,
  type SwapOffer,
  type SwapTrade,
} from "../CandySwapView";

const offer = (id: string, wantSlug: string, slugs: string[]): SwapOffer => ({
  id,
  wantSlug,
  candies: slugs.map((slug, i) => ({ id: i + 100, slug })),
});

const trade: SwapTrade = {
  id: "t1",
  with: { username: "bob", displayName: "Bob" },
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
  };
  render(
    <CandySwapView
      candyTypes={["banana", "berry-tart", "candy-corn", "luther-head"]}
      myCandies={[
        { id: 1, slug: "candy-corn" },
        { id: 2, slug: "candy-corn" },
        { id: 3, slug: "banana" },
      ]}
      offers={[]}
      myOffers={[]}
      trades={[]}
      maxOpenOffers={10}
      placing={false}
      acceptingId={null}
      cancellingId={null}
      rerolling={false}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
};

const section = (name: string) => screen.getByRole("region", { name });

describe("CandySwapView", () => {
  describe("offers to take", () => {
    it("shows what each offer gives and wants, and takes it", async () => {
      const { onAccept } = renderView({
        offers: [offer("o1", "banana", ["luther-head", "berry-tart"])],
      });

      const offers = section("Offers you can take");
      const card = within(offers).getByRole("listitem");
      expect(within(card).getByText("luther head")).toBeInTheDocument();
      expect(within(card).getByText("berry tart")).toBeInTheDocument();

      await userEvent.click(
        within(card).getByRole("button", { name: "Trade your banana" }),
      );
      expect(onAccept).toHaveBeenCalledWith("o1");
    });

    it("says when there are none, and asks for more", async () => {
      const { onReroll } = renderView({ offers: [] });
      const offers = section("Offers you can take");
      expect(
        within(offers).getByText("No offers you can take right now."),
      ).toBeInTheDocument();
      await userEvent.click(
        within(offers).getByRole("button", { name: "Show others" }),
      );
      expect(onReroll).toHaveBeenCalled();
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
      await userEvent.selectOptions(
        within(form).getByRole("combobox", { name: "Asking for" }),
        "luther-head",
      );
      await userEvent.click(
        within(form).getByRole("button", { name: "Place offer" }),
      );

      expect(onPlace).toHaveBeenCalledWith([1, 2], "luther-head");
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

    it("will not ask for a kind it gives", async () => {
      renderView();
      const form = section("Make an offer");
      await userEvent.click(
        within(form).getByRole("button", { name: "Add banana (1 left)" }),
      );
      const asking = within(form).getByRole("combobox", { name: "Asking for" });
      expect(
        within(asking).getByRole("option", { name: "banana" }),
      ).toBeDisabled();
    });

    it("needs a candy and a kind to ask for", async () => {
      renderView();
      const form = section("Make an offer");
      expect(
        within(form).getByRole("button", { name: "Place offer" }),
      ).toBeDisabled();
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
});
