import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WatchButtonView } from "../WatchButtonView";

describe("WatchButtonView", () => {
  it("offers to watch a character not yet watched", async () => {
    const onToggle = vi.fn();
    render(<WatchButtonView watching={false} onToggle={onToggle} />);

    await userEvent.click(screen.getByRole("button", { name: "Watch" }));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("says Watching once watched", () => {
    render(<WatchButtonView watching onToggle={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: "Watching" }),
    ).toBeInTheDocument();
  });
});
