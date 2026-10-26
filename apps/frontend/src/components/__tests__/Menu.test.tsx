/**
 * The shared overflow menu from `@chardb/ui`. Specs drive it the way a person
 * would -- click and keyboard -- and query it by role, since the roles are
 * what screen readers and the e2e suite both rely on.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "styled-components";
import { Menu, MenuGroup, MenuItem, lightTheme } from "@chardb/ui";

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
});
