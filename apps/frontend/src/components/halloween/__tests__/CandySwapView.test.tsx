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

const offer = (
  id: string,
  wantSlug: string | null,
  slugs: string[],
): SwapOffer => ({
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
      maxOffered={3}
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
        offers: [offer("o1", "banana", ["luther-head", "berry-tart"])],
      });

      const offers = section("Offers you can take");
      const card = within(offers).getByRole("listitem");
      expect(
        within(card).getByRole("img", { name: "luther head" }),
      ).toBeInTheDocument();
      expect(
        within(card).getByRole("img", { name: "berry tart" }),
      ).toBeInTheDocument();
      expect(
        within(card).getByRole("img", { name: "banana" }),
      ).toBeInTheDocument();
      // Pictures only: the names are for screen readers.
      expect(within(card).queryByText("luther head")).toBeNull();

      await userEvent.click(
        within(card).getByRole("button", { name: "Trade your banana" }),
      );
      expect(onAccept).toHaveBeenCalledWith("o1");
    });

    it("takes an offer for anything with the candy you pick", async () => {
      const { onAccept } = renderView({
        offers: [offer("o1", null, ["luther-head"])],
      });
      const card = within(section("Offers you can take")).getByRole("listitem");
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
      renderView({ offers: [offer("o1", null, ["banana"])] });
      const card = within(section("Offers you can take")).getByRole("listitem");
      await userEvent.click(
        within(card).getByRole("button", { name: "Pick a candy to trade" }),
      );
      const picker = screen.getByRole("dialog", { name: "Trade a candy" });
      expect(
        within(picker).getByRole("button", { name: "banana (you have 1)" }),
      ).toBeDisabled();
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
