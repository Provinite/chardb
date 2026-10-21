/**
 * The site admin's community list: turning the Halloween event on and off.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { MockedProvider, MockedResponse } from "@apollo/client/testing";
import { ThemeProvider } from "styled-components";
import { lightTheme } from "@chardb/ui";

vi.mock("react-hot-toast", () => {
  const stub = { success: vi.fn(), error: vi.fn() };
  return { default: stub, toast: stub, Toaster: () => null };
});

import {
  CommunitiesDocument,
  SetCommunityHalloweenEnabledDocument,
} from "../../generated/graphql";
import { CommunityManagementPage } from "../CommunityManagementPage";

const COMMUNITY_ID = "11111111-1111-4111-8111-111111111111";

const communitiesMock: MockedResponse = {
  request: { query: CommunitiesDocument, variables: { first: 50 } },
  result: {
    data: {
      communities: {
        __typename: "CommunityConnection",
        nodes: [
          {
            __typename: "Community",
            id: COMMUNITY_ID,
            name: "Cloverse",
            slug: "cloverse",
            halloweenEnabled: false,
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z",
          },
        ],
        hasNextPage: false,
        hasPreviousPage: false,
        totalCount: 1,
      },
    },
  },
};

const enableMock = {
  request: {
    query: SetCommunityHalloweenEnabledDocument,
    variables: { communityId: COMMUNITY_ID, enabled: true },
  },
  result: vi.fn(() => ({
    data: {
      setCommunityHalloweenEnabled: {
        __typename: "Community",
        id: COMMUNITY_ID,
        halloweenEnabled: true,
      },
    },
  })),
};

describe("CommunityManagementPage", () => {
  it("turns the Halloween event on for a community", async () => {
    render(<CommunityManagementPage />, {
      wrapper: ({ children }) => (
        <MockedProvider mocks={[communitiesMock, enableMock]}>
          <MemoryRouter>
            <ThemeProvider theme={lightTheme}>{children}</ThemeProvider>
          </MemoryRouter>
        </MockedProvider>
      ),
    });

    const card = await screen.findByTestId(`community-card-${COMMUNITY_ID}`);
    await userEvent.click(
      within(card).getByRole("button", { name: /Halloween: off/i }),
    );

    expect(
      await within(card).findByRole("button", { name: /Halloween: on/i }),
    ).toBeInTheDocument();
    expect(enableMock.result).toHaveBeenCalled();
  });
});
