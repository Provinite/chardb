/**
 * The public prize list: every prize with its stock, and the latest wins with
 * whatever the viewer may see of each winner.
 */
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import {
  PrizeListView,
  type PrizeLinkProps,
  type PrizeListing,
  type PublicWin,
} from "../PrizeListView";

const TestLink = ({ to, ...rest }: PrizeLinkProps) => <a href={to} {...rest} />;

const NOW = new Date("2025-10-15T17:00:00.000Z");

const candy: PrizeListing = {
  id: "candy",
  name: "Candy Corn",
  image: "https://cdn.test/candy.webp",
  initialStock: 5,
  currentStock: 4,
  itemTypeId: "it-1",
  characterId: null,
};
const ghost: PrizeListing = {
  id: "ghost",
  name: "A Ghost",
  image: null,
  initialStock: 1,
  currentStock: 0,
  itemTypeId: null,
  characterId: "ch-1",
};
const adopt: PrizeListing = {
  id: "adopt",
  name: "Spooky Adopt",
  image: "https://i.test/adopt.png",
  initialStock: 2,
  currentStock: 1,
  itemTypeId: null,
  characterId: null,
};

const win = (
  id: number,
  prize: PrizeListing,
  winner: PublicWin["winner"],
  time = "2025-10-15T16:55:00.000Z",
): PublicWin => ({ id, time, prize, winner });

const renderView = (prizes: PrizeListing[], wins: PublicWin[]) =>
  render(
    <PrizeListView
      prizes={prizes}
      wins={wins}
      now={NOW}
      LinkComponent={TestLink}
    />,
  );

describe("PrizeListView", () => {
  it("shows each prize with how many are left", () => {
    renderView([candy, adopt], []);
    const prizes = screen.getByRole("list", { name: "Prizes" });
    const items = within(prizes).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText("Candy Corn")).toBeInTheDocument();
    expect(within(items[0]).getByText("4 of 5 left")).toBeInTheDocument();
    expect(
      within(items[0]).getByRole("img", { name: "Candy Corn" }),
    ).toHaveAttribute("src", "https://cdn.test/candy.webp");
    expect(within(items[1]).getByText("1 of 2 left")).toBeInTheDocument();
  });

  it("links a chardb prize to its item type or character", () => {
    renderView([candy, ghost, adopt], []);
    const items = within(
      screen.getByRole("list", { name: "Prizes" }),
    ).getAllByRole("listitem");
    expect(
      within(items[0]).getByRole("link", { name: "View Candy Corn on chardb" }),
    ).toHaveAttribute("href", "/item-types/it-1");
    expect(
      within(items[1]).getByRole("link", { name: "View A Ghost on chardb" }),
    ).toHaveAttribute("href", "/character/ch-1");
    expect(within(items[2]).queryByRole("link")).not.toBeInTheDocument();
  });

  it("marks a prize with none left as all won", () => {
    renderView([ghost], []);
    const [item] = within(
      screen.getByRole("list", { name: "Prizes" }),
    ).getAllByRole("listitem");
    expect(within(item).getByText("All won")).toBeInTheDocument();
    expect(within(item).queryByText(/left$/)).not.toBeInTheDocument();
  });

  it("says when there are no prizes yet", () => {
    renderView([], []);
    expect(screen.getByText("No prizes yet.")).toBeInTheDocument();
  });

  it("names each winner as the server allows, newest first", () => {
    renderView(
      [candy, adopt],
      [
        win(3, candy, {
          kind: "MEMBER",
          displayName: "pumpkin",
          url: "/user/pumpkin",
        }),
        win(
          2,
          adopt,
          {
            kind: "DISCORD",
            displayName: "spookyfan",
            url: "https://discord.com/users/200000000000000001",
          },
          "2025-10-15T15:00:00.000Z",
        ),
        win(
          1,
          adopt,
          { kind: "ANONYMOUS", displayName: "A Discord user", url: null },
          "2025-10-13T17:00:00.000Z",
        ),
      ],
    );
    const feed = screen.getByRole("list", { name: "Recent wins" });
    const [member, discord, anonymous] = within(feed).getAllByRole("listitem");

    expect(
      within(member).getByRole("link", { name: "pumpkin" }),
    ).toHaveAttribute("href", "/user/pumpkin");
    expect(within(member).getByText("Candy Corn")).toBeInTheDocument();
    expect(within(member).getByText("5 minutes ago")).toBeInTheDocument();

    const discordLink = within(discord).getByRole("link", {
      name: "spookyfan",
    });
    expect(discordLink).toHaveAttribute(
      "href",
      "https://discord.com/users/200000000000000001",
    );
    expect(discordLink).toHaveAttribute("target", "_blank");
    expect(within(discord).getByText("2 hours ago")).toBeInTheDocument();

    expect(within(anonymous).getByText("A Discord user")).toBeInTheDocument();
    expect(within(anonymous).queryByRole("link")).not.toBeInTheDocument();
    expect(within(anonymous).getByText("2 days ago")).toBeInTheDocument();
  });

  it("holds skeletons in both lists while they load", () => {
    render(
      <PrizeListView
        prizes={null}
        wins={null}
        now={NOW}
        LinkComponent={TestLink}
      />,
    );
    for (const name of ["Prizes", "Recent wins"]) {
      const list = screen.getByRole("list", { name });
      expect(list).toHaveAttribute("aria-busy", "true");
      // Out of the accessibility tree: aria-busy says it is loading.
      expect(
        within(list).getAllByRole("listitem", { hidden: true }).length,
      ).toBeGreaterThan(0);
    }
    expect(screen.queryByText("No prizes yet.")).not.toBeInTheDocument();
    expect(screen.queryByText("No wins yet.")).not.toBeInTheDocument();
  });

  it("says when nobody has won yet", () => {
    renderView([candy], []);
    expect(screen.getByText("No wins yet.")).toBeInTheDocument();
  });
});
