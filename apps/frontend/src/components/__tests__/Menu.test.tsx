/**
 * The shared overflow menu from `@chardb/ui`. Specs drive it the way a person
 * would -- click and keyboard -- and query it by role, since the roles are
 * what screen readers and the e2e suite both rely on.
 */
import { describe, it, expect, vi } from "vitest";
import { Profiler } from "react";
import { act } from "@testing-library/react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "styled-components";
import {
  Menu,
  MenuGroup,
  MenuItem,
  MenuLinkItem,
  lightTheme,
  vars,
} from "@chardb/ui";

const renderMenu = (handlers: {
  onEdit?: () => void;
  onDelete?: () => void;
  deleteDisabled?: boolean;
}) =>
  render(
    <ThemeProvider theme={lightTheme}>
      <button type="button">before</button>
      <Menu label="More actions" testId="menu">
        <MenuItem onSelect={handlers.onEdit ?? vi.fn()}>Edit</MenuItem>
        <MenuGroup label="Staff actions">
          <MenuItem onSelect={vi.fn()}>Remove from Species</MenuItem>
          <MenuItem
            danger
            disabled={handlers.deleteDisabled}
            onSelect={handlers.onDelete ?? vi.fn()}
          >
            Delete
          </MenuItem>
        </MenuGroup>
      </Menu>
    </ThemeProvider>,
  );

const trigger = () => screen.getByRole("button", { name: "More actions" });

describe("Menu", () => {
  it("renders only the trigger until opened", () => {
    renderMenu({});

    expect(trigger()).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens on click and focuses the first item", async () => {
    const user = userEvent.setup();
    renderMenu({});

    await user.click(trigger());

    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Edit" })).toHaveFocus();
  });

  it("labels each group", async () => {
    const user = userEvent.setup();
    renderMenu({});

    await user.click(trigger());

    const group = screen.getByRole("group", { name: "Staff actions" });
    expect(group).toContainElement(
      screen.getByRole("menuitem", { name: "Delete" }),
    );
  });

  it("runs the item and closes", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    renderMenu({ onEdit });

    await user.click(trigger());
    await user.click(screen.getByRole("menuitem", { name: "Edit" }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("moves between items with the arrow keys, wrapping at the ends", async () => {
    const user = userEvent.setup();
    renderMenu({});

    await user.click(trigger());
    await user.keyboard("{ArrowDown}");
    expect(
      screen.getByRole("menuitem", { name: "Remove from Species" }),
    ).toHaveFocus();

    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Edit" })).toHaveFocus();

    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus();

    await user.keyboard("{Home}");
    expect(screen.getByRole("menuitem", { name: "Edit" })).toHaveFocus();

    await user.keyboard("{End}");
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus();
  });

  it("selects the focused item with Enter", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    renderMenu({ onEdit });

    await user.click(trigger());
    await user.keyboard("{Enter}");

    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    renderMenu({});

    await user.click(trigger());
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it("opens from the keyboard with ArrowDown", async () => {
    const user = userEvent.setup();
    renderMenu({});

    trigger().focus();
    await user.keyboard("{ArrowDown}");

    expect(screen.getByRole("menuitem", { name: "Edit" })).toHaveFocus();
  });

  it("closes on a click outside", async () => {
    const user = userEvent.setup();
    renderMenu({});

    await user.click(trigger());
    await user.click(screen.getByRole("button", { name: "before" }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens upward when there is no room below the button", async () => {
    // jsdom has no layout, so place the button at the bottom of the viewport
    // and give the list a height by hand.
    const user = userEvent.setup();
    renderMenu({});
    const bottom = window.innerHeight - 10;
    vi.spyOn(trigger(), "getBoundingClientRect").mockReturnValue({
      top: bottom - 32,
      bottom,
      left: 100,
      right: 132,
      width: 32,
      height: 32,
      x: 100,
      y: bottom - 32,
      toJSON: () => ({}),
    });
    const height = vi
      .spyOn(HTMLElement.prototype, "offsetHeight", "get")
      .mockReturnValue(120);

    await user.click(trigger());

    const top = parseFloat(screen.getByRole("menu").style.top);
    expect(top + 120).toBeLessThanOrEqual(bottom - 32);
    height.mockRestore();
  });

  it("keeps the list on-screen when the button is near the left edge", async () => {
    const user = userEvent.setup();
    renderMenu({});
    vi.spyOn(trigger(), "getBoundingClientRect").mockReturnValue({
      top: 100,
      bottom: 132,
      left: 10,
      right: 42,
      width: 32,
      height: 32,
      x: 10,
      y: 100,
      toJSON: () => ({}),
    });
    const width = vi
      .spyOn(HTMLElement.prototype, "offsetWidth", "get")
      .mockReturnValue(192);

    await user.click(trigger());

    expect(parseFloat(screen.getByRole("menu").style.left)).toBeGreaterThan(0);
    width.mockRestore();
  });

  it("does not re-render its items when a scroll leaves it in place", async () => {
    const user = userEvent.setup();
    let renders = 0;
    render(
      <ThemeProvider theme={lightTheme}>
        <Profiler id="menu" onRender={() => (renders += 1)}>
          <Menu label="More actions">
            <MenuItem onSelect={vi.fn()}>Counted</MenuItem>
          </Menu>
        </Profiler>
      </ThemeProvider>,
    );

    await user.click(trigger());
    const before = renders;
    act(() => {
      window.dispatchEvent(new Event("scroll"));
      window.dispatchEvent(new Event("scroll"));
    });

    expect(renders).toBe(before);
  });

  it("does not run a disabled item", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    renderMenu({ onDelete, deleteDisabled: true });

    await user.click(trigger());
    const item = screen.getByRole("menuitem", { name: "Delete" });
    expect(item).toHaveAttribute("aria-disabled", "true");
    await user.click(item);

    expect(onDelete).not.toHaveBeenCalled();
  });

  it("has a borderless ghost trigger at the comfortable touch size", () => {
    render(
      <ThemeProvider theme={lightTheme}>
        <Menu label="More actions">
          <MenuItem onSelect={vi.fn()}>Edit</MenuItem>
        </Menu>
        <Menu label="Account" appearance="ghost" trigger="CA">
          <MenuItem onSelect={vi.fn()}>Log out</MenuItem>
        </Menu>
      </ThemeProvider>,
    );
    const style = getComputedStyle(
      screen.getByRole("button", { name: "Account" }),
    );
    // jsdom drops `border: none` rather than computing it, so the check is
    // that the outlined trigger's border is gone.
    expect(getComputedStyle(trigger()).borderStyle).toBe("solid");
    expect(style.borderStyle).not.toBe("solid");
    expect(style.minHeight).toBe(vars.size.target.comfortable);
    expect(style.minWidth).toBe(vars.size.target.comfortable);
  });
});

describe("MenuLinkItem", () => {
  const renderWithLink = () =>
    render(
      <ThemeProvider theme={lightTheme}>
        <Menu label="Account">
          <MenuLinkItem>
            <a href="/user/ash">My profile</a>
          </MenuLinkItem>
          <MenuItem onSelect={vi.fn()}>Log out</MenuItem>
        </Menu>
      </ThemeProvider>,
    );

  const openAccount = async () => {
    const user = userEvent.setup();
    renderWithLink();
    await user.click(screen.getByRole("button", { name: "Account" }));
    return user;
  };

  it("is the caller's own link, so it opens in a new tab like any other", async () => {
    await openAccount();
    const item = screen.getByRole("menuitem", { name: "My profile" });
    expect(item.tagName).toBe("A");
    expect(item).toHaveAttribute("href", "/user/ash");
  });

  it("takes focus first and is reached by the arrow keys", async () => {
    const user = await openAccount();
    expect(screen.getByRole("menuitem", { name: "My profile" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Log out" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "My profile" })).toHaveFocus();
  });

  it("closes the menu when followed", async () => {
    const user = await openAccount();
    const item = screen.getByRole("menuitem", { name: "My profile" });
    // jsdom does not navigate, so the click only has to close the menu.
    item.addEventListener("click", (e) => e.preventDefault());
    await user.click(item);
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
