/**
 * The shared search-and-pick box from `@chardb/ui`. It fetches nothing: the
 * caller searches and hands it options, so these specs drive it with plain
 * props.
 */
import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "styled-components";
import {
  CharacterTypeahead,
  ItemTypeTypeahead,
  lightTheme,
  type SearchSelectOption,
} from "@chardb/ui";

const wisp: SearchSelectOption = {
  id: "ch-1",
  name: "Pumpkin Wisp",
  image: "https://cdn.test/wisp.webp",
  subtitle: "Lanternkin",
};
const moth: SearchSelectOption = { id: "ch-2", name: "Moth Ghost" };

/** Holds the selection the way a form would. */
const Harness: React.FC<{
  options: SearchSelectOption[];
  onSearch?: (search: string) => void;
  onChange?: (option: SearchSelectOption | null) => void;
  initial?: SearchSelectOption | null;
  minSearchLength?: number;
}> = ({ options, onSearch = vi.fn(), onChange, initial = null, ...rest }) => {
  const [value, setValue] = useState<SearchSelectOption | null>(initial);
  return (
    <ThemeProvider theme={lightTheme}>
      <CharacterTypeahead
        label="Character"
        value={value}
        options={options}
        onSearch={onSearch}
        onChange={(option) => {
          setValue(option);
          onChange?.(option);
        }}
        {...rest}
      />
    </ThemeProvider>
  );
};

describe("CharacterTypeahead", () => {
  it("lists nothing until two characters are typed", async () => {
    const onSearch = vi.fn();
    render(<Harness options={[wisp, moth]} onSearch={onSearch} />);
    const box = screen.getByRole("combobox", { name: "Character" });
    await userEvent.click(box);
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    expect(
      screen.getByText("Type at least 2 characters to search"),
    ).toBeInTheDocument();

    await userEvent.type(box, "p");
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 400));
    expect(onSearch).not.toHaveBeenCalled();
  });

  it("asks the caller to search once typing pauses", async () => {
    const onSearch = vi.fn();
    render(<Harness options={[]} onSearch={onSearch} />);
    await userEvent.type(
      screen.getByRole("combobox", { name: "Character" }),
      "pum",
    );
    await vi.waitFor(() => expect(onSearch).toHaveBeenCalledWith("pum"));
    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it("shows each option's picture and detail, and picks one", async () => {
    const onChange = vi.fn();
    render(<Harness options={[wisp, moth]} onChange={onChange} />);
    await userEvent.type(
      screen.getByRole("combobox", { name: "Character" }),
      "pu",
    );
    const option = screen.getByRole("option", { name: /Pumpkin Wisp/ });
    expect(option.querySelector("img")).toHaveAttribute(
      "src",
      "https://cdn.test/wisp.webp",
    );
    expect(option).toHaveTextContent("Lanternkin");

    await userEvent.click(option);
    expect(onChange).toHaveBeenCalledWith(wisp);
    expect(screen.getByText("Pumpkin Wisp")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("picks with the keyboard", async () => {
    const onChange = vi.fn();
    render(<Harness options={[wisp, moth]} onChange={onChange} />);
    await userEvent.type(
      screen.getByRole("combobox", { name: "Character" }),
      "gh{ArrowDown}{ArrowDown}{Enter}",
    );
    expect(onChange).toHaveBeenCalledWith(moth);
  });

  it("clears a pick", async () => {
    const onChange = vi.fn();
    render(<Harness options={[]} initial={wisp} onChange={onChange} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Clear character" }),
    );
    expect(onChange).toHaveBeenCalledWith(null);
    expect(
      screen.getByRole("combobox", { name: "Character" }),
    ).toBeInTheDocument();
  });

  it("says when nothing matched, once the search has gone out", async () => {
    render(<Harness options={[]} />);
    await userEvent.type(
      screen.getByRole("combobox", { name: "Character" }),
      "zz",
    );
    // Typing has paused for less than the search delay: nothing has been
    // asked yet, so "nothing found" would be a guess.
    expect(screen.queryByText("No characters found")).not.toBeInTheDocument();
    expect(screen.getByText("Searching...")).toBeInTheDocument();
    expect(await screen.findByText("No characters found")).toBeInTheDocument();
  });

  it("says the search failed instead of that nothing matched", async () => {
    render(
      <ThemeProvider theme={lightTheme}>
        <CharacterTypeahead
          value={null}
          options={[]}
          onSearch={vi.fn()}
          onChange={vi.fn()}
          searchError="Couldn't search characters. Try again."
        />
      </ThemeProvider>,
    );
    await userEvent.type(
      screen.getByRole("combobox", { name: "Character" }),
      "zz",
    );
    expect(
      await screen.findByText("Couldn't search characters. Try again."),
    ).toBeInTheDocument();
    expect(screen.queryByText("No characters found")).not.toBeInTheDocument();
  });

  it("can list everything as soon as it opens", async () => {
    const onSearch = vi.fn();
    render(
      <Harness options={[wisp]} onSearch={onSearch} minSearchLength={0} />,
    );
    await userEvent.click(screen.getByRole("combobox", { name: "Character" }));
    expect(screen.getByRole("option", { name: /Pumpkin Wisp/ })).toBeVisible();
  });
});

describe("ItemTypeTypeahead", () => {
  it("says when no item type matched", async () => {
    render(
      <ThemeProvider theme={lightTheme}>
        <ItemTypeTypeahead
          label="Item type"
          value={null}
          options={[]}
          onSearch={vi.fn()}
          onChange={vi.fn()}
        />
      </ThemeProvider>,
    );
    await userEvent.type(
      screen.getByRole("combobox", { name: "Item type" }),
      "zz",
    );
    expect(await screen.findByText("No item types found")).toBeInTheDocument();
  });
});
