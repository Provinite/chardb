import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { HalloweenNavigationSection } from "../HalloweenNavigationSection";

describe("HalloweenNavigationSection", () => {
  it("is a region named by its Halloween heading, holding its links", () => {
    render(
      <HalloweenNavigationSection>
        <a href="/halloween/board">Candy Boards</a>
        <a href="/halloween/swap">Candy Swap</a>
      </HalloweenNavigationSection>,
    );
    const region = screen.getByRole("region", { name: "Halloween" });
    expect(
      within(region).getByRole("heading", { name: "Halloween" }),
    ).toBeInTheDocument();
    expect(
      within(region).getByRole("link", { name: "Candy Boards" }),
    ).toBeInTheDocument();
    expect(
      within(region).getByRole("link", { name: "Candy Swap" }),
    ).toBeInTheDocument();
  });
});
