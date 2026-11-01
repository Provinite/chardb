import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { AchievementList } from "../AchievementList";

const trickOrTreater = {
  id: "a1",
  name: "Trick-or-Treater 2026",
  description: "Signed in during Trick-or-Treat 2026.",
  imagePath: "/halloween/candy/big-candy-corn.png",
  earnedAt: "2026-10-15T12:00:00.000Z",
  community: { id: "c1", name: "Cloverse" },
};

describe("AchievementList", () => {
  it("shows each achievement with its picture, description and community", () => {
    render(<AchievementList achievements={[trickOrTreater]} />);

    const item = screen.getByRole("listitem");
    expect(within(item).getByText("Trick-or-Treater 2026")).toBeTruthy();
    expect(
      within(item).getByText("Signed in during Trick-or-Treat 2026."),
    ).toBeTruthy();
    expect(within(item).getByText(/Cloverse/)).toBeTruthy();
    // Decorative: the name beside it says what it is.
    const img = within(item).getByRole("presentation");
    expect(img.getAttribute("src")).toBe("/halloween/candy/big-candy-corn.png");
    expect(img.getAttribute("width")).toBeTruthy();
    expect(img.getAttribute("height")).toBeTruthy();
  });

  it("dates when it was earned", () => {
    render(<AchievementList achievements={[trickOrTreater]} />);
    const time = screen.getByText(
      (_, el) => el?.tagName === "TIME",
    ) as HTMLTimeElement;
    expect(time.dateTime).toBe("2026-10-15T12:00:00.000Z");
  });
});
