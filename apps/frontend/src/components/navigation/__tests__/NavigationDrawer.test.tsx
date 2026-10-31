/**
 * The drawer the navigation sidebar becomes below `md`. The setup file's
 * matchMedia answers no to every query, so these run at phone width.
 */
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NavigationDrawer } from "../NavigationDrawer";

const Harness = ({ onClose }: { onClose?: () => void }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open navigation
      </button>
      <NavigationDrawer
        open={open}
        onClose={() => {
          onClose?.();
          setOpen(false);
        }}
      >
        <a href="/feed">Activity Feed</a>
      </NavigationDrawer>
    </>
  );
};

const openDrawer = async () => {
  const user = userEvent.setup();
  render(<Harness />);
  await user.click(screen.getByRole("button", { name: "Open navigation" }));
  return user;
};

describe("NavigationDrawer", () => {
  it("is a modal dialog named for navigation while open", async () => {
    await openDrawer();
    const dialog = screen.getByRole("dialog", { name: "Navigation" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("is not a dialog while closed", () => {
    render(<Harness />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("moves focus into the drawer when it opens", async () => {
    await openDrawer();
    expect(
      screen.getByRole("button", { name: "Close navigation" }),
    ).toHaveFocus();
  });

  it("closes on Escape and returns focus to what opened it", async () => {
    const user = await openDrawer();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Open navigation" }),
    ).toHaveFocus();
  });

  it("closes from its close button", async () => {
    const user = await openDrawer();
    await user.click(screen.getByRole("button", { name: "Close navigation" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes on a tap on the scrim", async () => {
    const user = await openDrawer();
    await user.click(screen.getByTestId("navigation-scrim"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("stops the page behind it scrolling while open", async () => {
    const user = await openDrawer();
    const locked = [...document.documentElement.classList];
    expect(locked.length).toBeGreaterThan(0);
    await user.keyboard("{Escape}");
    for (const name of locked) {
      expect(document.documentElement.classList).not.toContain(name);
    }
  });

  it("ignores Escape while closed", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<Harness onClose={onClose} />);
    await user.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
  });
});
