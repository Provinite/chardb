import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { SortableList } from "../SortableList";

const rarities = [
  { id: "u", name: "Uncommon" },
  { id: "c", name: "Common" },
  { id: "r", name: "Rare" },
];

const renderList = (onReorder = vi.fn(), editable = true) =>
  render(
    <SortableList
      aria-label="Variants"
      items={rarities}
      getId={(r) => r.id}
      getName={(r) => r.name}
      onReorder={onReorder}
      editable={editable}
    >
      {(r) => <span>{r.name}</span>}
    </SortableList>,
  );

describe("SortableList", () => {
  it("lists the items in the order given", () => {
    renderList();

    const list = screen.getByRole("list", { name: "Variants" });
    expect(
      within(list)
        .getAllByRole("listitem")
        .map((row) => row.textContent),
    ).toEqual(["Uncommon", "Common", "Rare"]);
  });

  it("moves an item up or down with a tap", () => {
    const onReorder = vi.fn();
    renderList(onReorder);

    fireEvent.click(screen.getByRole("button", { name: "Move Common up" }));
    expect(onReorder).toHaveBeenLastCalledWith(["c", "u", "r"]);

    fireEvent.click(screen.getByRole("button", { name: "Move Common down" }));
    expect(onReorder).toHaveBeenLastCalledWith(["u", "r", "c"]);
  });

  it("cannot move the first item up or the last one down", () => {
    renderList();

    expect(
      screen
        .getByRole("button", { name: "Move Uncommon up" })
        .hasAttribute("disabled"),
    ).toBe(true);
    expect(
      screen
        .getByRole("button", { name: "Move Rare down" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });

  it("names each drag handle for the item it moves", () => {
    renderList();

    expect(
      screen.getByRole("button", { name: "Drag to reorder Rare" }),
    ).toBeTruthy();
  });

  it("shows no reorder controls to someone who cannot edit", () => {
    renderList(vi.fn(), false);

    expect(screen.queryAllByRole("button")).toEqual([]);
  });
});
