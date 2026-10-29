/**
 * The site admin index offers each viewer only the pages they may open
 * (#405). A non-admin who holds canCreateCommunity reaches it to manage
 * communities, and should not be shown cards that lead to not found.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MockedProvider } from "@apollo/client/testing";
import { ThemeProvider } from "styled-components";
import { lightTheme } from "@chardb/ui";

const auth = vi.hoisted(() => ({
  user: {
    id: "u1",
    isAdmin: false,
    canCreateInviteCode: false,
    canListInviteCodes: false,
    canCreateCommunity: false,
  },
  loading: false,
}));

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => auth,
}));

import { SiteAdminPage } from "../SiteAdminPage";

function renderPage() {
  return render(
    <MockedProvider mocks={[]}>
      <ThemeProvider theme={lightTheme}>
        <MemoryRouter>
          <SiteAdminPage />
        </MemoryRouter>
      </ThemeProvider>
    </MockedProvider>,
  );
}

const cardNames = () =>
  screen.getAllByRole("link").map((link) => link.getAttribute("href"));

describe("SiteAdminPage cards", () => {
  beforeEach(() => {
    auth.user = {
      id: "u1",
      isAdmin: false,
      canCreateInviteCode: false,
      canListInviteCodes: false,
      canCreateCommunity: false,
    };
  });

  it("shows a site admin every card", () => {
    auth.user.isAdmin = true;
    renderPage();

    expect(cardNames()).toEqual(
      expect.arrayContaining([
        "/admin/site-invite-codes",
        "/admin/communities",
        "/admin/deviantart-backfill",
        "/admin/discord-names",
      ]),
    );
  });

  it("shows a community creator only community management", () => {
    auth.user.canCreateCommunity = true;
    renderPage();

    expect(cardNames()).toEqual(["/admin/communities"]);
  });

  it("shows an invite code holder only invite codes", () => {
    auth.user.canCreateInviteCode = true;
    renderPage();

    expect(cardNames()).toEqual(["/admin/site-invite-codes"]);
  });
});
