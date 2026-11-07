import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RandomCharacterButton } from "../RandomCharacterButton";

describe("RandomCharacterButton", () => {
  it("says how many it picks from", () => {
    render(<RandomCharacterButton count={47} onPick={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: "Random character (47 available)" }),
    ).toBeEnabled();
  });

  it("says there is nothing to pick once it knows", () => {
    render(<RandomCharacterButton count={0} onPick={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: "No characters available" }),
    ).toBeDisabled();
  });

  it("does not claim nothing is available while the count loads", () => {
    render(<RandomCharacterButton count={0} onPick={vi.fn()} busy />);

    expect(
      screen.getByRole("button", { name: "Random character" }),
    ).toHaveAttribute("aria-disabled", "true");
  });
});
