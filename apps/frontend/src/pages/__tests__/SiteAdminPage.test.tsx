/**
 * The site admin index links to the site-wide image queue with its pending
 * count, so an avatar uploaded at the apex has somewhere to be approved (#404).
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MockedProvider, MockedResponse } from "@apollo/client/testing";
import { ThemeProvider } from "styled-components";
import { lightTheme } from "@chardb/ui";

import { GlobalPendingImageCountDocument } from "../../generated/graphql";
import { SiteAdminPage } from "../SiteAdminPage";

const pendingCount: MockedResponse = {
  request: { query: GlobalPendingImageCountDocument },
  result: { data: { globalPendingImageCount: 3 } },
};

describe("SiteAdminPage", () => {
  it("links to the site-wide image queue with its pending count", async () => {
    render(
      <MockedProvider mocks={[pendingCount]}>
        <ThemeProvider theme={lightTheme}>
          <MemoryRouter>
            <SiteAdminPage />
          </MemoryRouter>
        </ThemeProvider>
      </MockedProvider>,
    );

    const card = screen.getByRole("link", { name: /image moderation/i });
    expect(card).toHaveAttribute("href", "/admin/moderation/images");
    expect(await screen.findByText("3 pending")).toBeInTheDocument();
  });
});
