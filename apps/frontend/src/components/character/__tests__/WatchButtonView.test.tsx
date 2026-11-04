import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WatchButtonView } from "../WatchButtonView";

describe("WatchButtonView", () => {
  it("offers to watch a character not yet watched", async () => {
    const onToggle = vi.fn();
    render(
      <WatchButtonView watching={false} pending={false} onToggle={onToggle} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Watch" }));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("says Watching once watched", () => {
    render(<WatchButtonView watching pending={false} onToggle={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: "Watching" }),
    ).toBeInTheDocument();
  });

  it("claims neither until the status arrives", () => {
    render(<WatchButtonView watching={false} pending onToggle={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Watch" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Loading watch status" }),
    ).toBeInTheDocument();
  });
});
