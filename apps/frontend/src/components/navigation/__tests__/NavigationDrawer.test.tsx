/**
 * The drawer the navigation sidebar becomes below `md`. Whether it is open,
 * and so modal, is the caller's decision; `Layout` keeps it closed from `md`.
 */
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NavigationDrawer } from "../NavigationDrawer";
import * as styles from "../NavigationDrawer.css";

const Harness = ({ onClose }: { onClose?: () => void }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open navigation
      </button>
      <button type="button">Elsewhere</button>
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

  describe("links", () => {
    // jsdom does not navigate, so following a link only has to close it.
    const link = () => {
      const a = screen.getByRole("link", { name: "Activity Feed" });
      a.addEventListener("click", (e) => e.preventDefault());
      return a;
    };

    it("closes when a link in it is followed, even to the page already open", async () => {
      const user = await openDrawer();
      await user.click(link());
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("stays open when a link is opened in a new tab", async () => {
      await openDrawer();
      fireEvent.click(link(), { ctrlKey: true });
      fireEvent.click(link(), { metaKey: true });
      fireEvent.click(link(), { button: 1 });
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  it("leaves an Escape meant for something outside it alone", async () => {
    const user = await openDrawer();
    // A dialog opened from the drawer, such as the page search, takes focus
    // out of it; its Escape closes that dialog, not the drawer.
    screen.getByRole("button", { name: "Elsewhere" }).focus();
    await user.keyboard("{Escape}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("does not hand focus back to an opener that is no longer shown", async () => {
    const user = await openDrawer();
    const opener = screen.getByRole("button", { name: "Open navigation" });
    // From `md` the menu button is hidden while the drawer closes.
    opener.checkVisibility = () => false;
    await user.keyboard("{Escape}");
    expect(opener).not.toHaveFocus();
  });

  describe("scroll lock", () => {
    afterEach(() => vi.restoreAllMocks());

    it("keeps the scrollbar's space when the page has a scrollbar", async () => {
      vi.spyOn(document.documentElement, "scrollHeight", "get").mockReturnValue(
        2000,
      );
      vi.spyOn(document.documentElement, "clientHeight", "get").mockReturnValue(
        800,
      );
      await openDrawer();
      expect(document.documentElement).toHaveClass(styles.scrollLock);
      expect(document.documentElement).toHaveClass(styles.keepGutter);
    });

    it("reserves no space when the page had no scrollbar", async () => {
      await openDrawer();
      expect(document.documentElement).toHaveClass(styles.scrollLock);
      expect(document.documentElement).not.toHaveClass(styles.keepGutter);
    });
  });
});
