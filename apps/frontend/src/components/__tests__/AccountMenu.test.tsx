/**
 * The header's account menu. What it holds depends on the width: below `sm`
 * it also carries the header controls that no longer fit.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen, within } from "../../__tests__/test-utils";
import { AccountMenu, type AccountMenuProps } from "../AccountMenu";

const wideAt = (wide: boolean) =>
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: wide,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }) as unknown as MediaQueryList,
  );

const user = {
  username: "ash",
  displayName: "Ash Ketchum",
  avatarImage: null,
};

const renderMenu = (props: Partial<AccountMenuProps> = {}) => {
  const handlers = {
    onLogout: vi.fn(),
    onToggleTheme: vi.fn(),
  };
  render(
    <AccountMenu
      user={user}
      themeMode="light"
      canCreateCharacter
      profileTo="/members/ash"
      {...handlers}
      {...props}
    />,
  );
  return handlers;
};

const openMenu = async (name: RegExp) => {
  const u = userEvent.setup();
  await u.click(screen.getByRole("button", { name }));
  return { u, menu: screen.getByRole("menu") };
};

const itemNames = (menu: HTMLElement) =>
  within(menu)
    .getAllByRole("menuitem")
    .map((item) => item.textContent);

afterEach(() => vi.restoreAllMocks());

describe("AccountMenu, signed in", () => {
  it("is named for the person, with their visible name first", () => {
    wideAt(true);
    renderMenu();
    expect(
      screen.getByRole("button", { name: "Ash Ketchum, account menu" }),
    ).toBeInTheDocument();
  });

  it("holds the profile and log out from sm up", async () => {
    wideAt(true);
    renderMenu();
    const { menu } = await openMenu(/account menu/);
    expect(itemNames(menu)).toEqual(["My profile", "Log out"]);
  });

  it("also holds the header's create, upload and theme controls below sm", async () => {
    wideAt(false);
    renderMenu();
    const { menu } = await openMenu(/account menu/);
    expect(itemNames(menu)).toEqual([
      "My profile",
      "Create Character",
      "Upload",
      "Switch to dark mode",
      "Log out",
    ]);
  });

  it("leaves out Create Character where there is no community", async () => {
    wideAt(false);
    renderMenu({ canCreateCharacter: false });
    const { menu } = await openMenu(/account menu/);
    expect(itemNames(menu)).not.toContain("Create Character");
  });

  it("makes every destination a real link, so it opens in a new tab like any other", async () => {
    wideAt(false);
    renderMenu();
    const { menu } = await openMenu(/account menu/);
    const href = (name: string) =>
      within(menu).getByRole("menuitem", { name }).getAttribute("href");
    expect(href("My profile")).toBe("/members/ash");
    expect(href("Create Character")).toBe("/character/create");
    expect(href("Upload")).toBe("/upload");
    for (const name of ["My profile", "Create Character", "Upload"]) {
      expect(within(menu).getByRole("menuitem", { name }).tagName).toBe("A");
    }
  });

  it("switches theme and logs out", async () => {
    wideAt(false);
    const handlers = renderMenu();

    let { u, menu } = await openMenu(/account menu/);
    await u.click(
      within(menu).getByRole("menuitem", { name: "Switch to dark mode" }),
    );
    expect(handlers.onToggleTheme).toHaveBeenCalled();

    ({ u, menu } = await openMenu(/account menu/));
    await u.click(within(menu).getByRole("menuitem", { name: "Log out" }));
    expect(handlers.onLogout).toHaveBeenCalled();
  });
});

describe("AccountMenu, signed out", () => {
  it("says it is for signing in, and holds log in and sign up", async () => {
    wideAt(true);
    renderMenu({ user: null });
    const { menu } = await openMenu(/^Log in or sign up$/);
    expect(itemNames(menu)).toEqual(["Log in", "Sign up"]);
    expect(
      within(menu).getByRole("menuitem", { name: "Log in" }),
    ).toHaveAttribute("href", expect.stringMatching(/\/login/));
    expect(
      within(menu).getByRole("menuitem", { name: "Sign up" }),
    ).toHaveAttribute("href", "/signup");
  });
});
