import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { DoorKnockToast } from "../DoorKnockToast";

describe("DoorKnockToast", () => {
  it("pictures each side's candies under who got them", () => {
    render(
      <DoorKnockToast
        name="Moderator"
        knockerCandies={["candy-corn"]}
        knockeeCandies={["banana", "berry-tart"]}
      />,
    );

    const yours = screen.getByRole("group", { name: "You got" });
    const theirs = screen.getByRole("group", { name: "Moderator got" });
    expect(
      within(yours)
        .getAllByRole("img")
        .map((img) => img.getAttribute("alt")),
    ).toEqual(["candy corn"]);
    expect(
      within(theirs)
        .getAllByRole("img")
        .map((img) => img.getAttribute("alt")),
    ).toEqual(["banana", "berry tart"]);
  });
});
