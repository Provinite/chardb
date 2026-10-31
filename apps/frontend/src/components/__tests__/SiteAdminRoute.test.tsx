/**
 * Site administration pages render only for whoever the page's own resolvers
 * would serve (#405). The server refuses everyone else the data either way;
 * this keeps them from being shown the admin UI with forbidden errors where
 * its content should be.
 */
import { Suspense } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { lightTheme } from "@chardb/ui";

interface TestViewer {
  id: string;
  isAdmin: boolean;
  canCreateInviteCode: boolean;
  canListInviteCodes: boolean;
  canCreateCommunity: boolean;
}

const auth = vi.hoisted(() => ({
  user: null as TestViewer | null,
  loading: false,
}));

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => auth,
}));

vi.mock("../../pages/NotFoundPage", () => ({
  NotFoundPage: () => <div>Page not found</div>,
}));

import { SiteAdminRoute } from "../SiteAdminRoute";
import { canManageCommunities, isSiteAdmin } from "../../lib/siteAdminAccess";

const nobody: TestViewer = {
  id: "u1",
  isAdmin: false,
  canCreateInviteCode: false,
  canListInviteCodes: false,
  canCreateCommunity: false,
};

function renderRoute(allow: typeof isSiteAdmin) {
  return render(
    <ThemeProvider theme={lightTheme}>
      <MemoryRouter initialEntries={["/admin"]}>
        {/* The not-found page is lazy, as in the app's route table. */}
        <Suspense fallback={null}>
          <SiteAdminRoute allow={allow}>
            <div>Admin content</div>
          </SiteAdminRoute>
        </Suspense>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("SiteAdminRoute", () => {
  beforeEach(() => {
    auth.user = null;
    auth.loading = false;
  });

  it("renders its children for a site admin", () => {
    auth.user = { ...nobody, isAdmin: true };
    renderRoute(isSiteAdmin);

    expect(screen.getByText("Admin content")).toBeInTheDocument();
  });

  it("shows not found to a signed-in user the page does not allow", async () => {
    auth.user = nobody;
    renderRoute(isSiteAdmin);

    expect(await screen.findByText("Page not found")).toBeInTheDocument();
    expect(screen.queryByText("Admin content")).not.toBeInTheDocument();
  });

  /**
   * The reason this takes a predicate rather than checking isAdmin: the
   * server lets canCreateCommunity holders manage communities, and this page
   * is their only way to.
   */
  it("renders for a non-admin holding the page's permission", () => {
    auth.user = { ...nobody, canCreateCommunity: true };
    renderRoute(canManageCommunities);

    expect(screen.getByText("Admin content")).toBeInTheDocument();
  });

  it("does not render its children for a signed-out visitor", () => {
    renderRoute(isSiteAdmin);

    expect(screen.queryByText("Admin content")).not.toBeInTheDocument();
  });
});
