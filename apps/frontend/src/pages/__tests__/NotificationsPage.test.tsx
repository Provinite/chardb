import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MockedResponse } from "@apollo/client/testing";
import { render } from "../../__tests__/test-utils";
import {
  MARK_ALL_NOTIFICATIONS_READ,
  NOTIFICATIONS_QUERY,
} from "../../graphql/notifications.graphql";

const mocks = vi.hoisted(() => ({
  hostCommunity: null as { id: string; name: string; slug: string } | null,
}));

vi.mock("../../contexts/CommunityHostContext", async () => {
  const actual = await vi.importActual<
    typeof import("../../contexts/CommunityHostContext")
  >("../../contexts/CommunityHostContext");
  return {
    ...actual,
    useHostCommunity: () => mocks.hostCommunity,
  };
});

import { NotificationsPage } from "../NotificationsPage";

const emptyPage = (
  variables: Record<string, unknown>,
  marker: string,
): MockedResponse => ({
  request: { query: NOTIFICATIONS_QUERY, variables },
  result: {
    data: {
      notifications: {
        __typename: "NotificationConnection",
        nodes: [],
        totalCount: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    },
  },
  // Identifies which request was answered without inspecting Apollo.
  newData: () => {
    document.body.dataset.answered = marker;
    return {
      data: {
        notifications: {
          __typename: "NotificationConnection",
          nodes: [],
          totalCount: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
    };
  },
});

describe("NotificationsPage", () => {
  beforeEach(() => {
    mocks.hostCommunity = null;
    delete document.body.dataset.answered;
  });

  it("asks for everything at the apex", async () => {
    render(<NotificationsPage />, {
      mocks: [emptyPage({ first: 25, unreadOnly: false }, "everything")],
    });

    await screen.findByText(/Nothing yet/);
    expect(document.body.dataset.answered).toBe("everything");
    expect(
      screen.queryByRole("button", { name: "Everywhere" }),
    ).not.toBeInTheDocument();
  });

  it("narrows to the community on a community host", async () => {
    mocks.hostCommunity = {
      id: "community-1",
      name: "Willowmere",
      slug: "willowmere",
    };
    render(<NotificationsPage />, {
      mocks: [
        emptyPage(
          { first: 25, unreadOnly: false, communityId: "community-1" },
          "community",
        ),
      ],
    });

    await screen.findByText(/Nothing yet/);
    expect(document.body.dataset.answered).toBe("community");
  });

  it("marks read only what the narrowed list shows", async () => {
    mocks.hostCommunity = {
      id: "community-1",
      name: "Willowmere",
      slug: "willowmere",
    };
    const markedFor = vi.fn();
    const user = userEvent.setup();
    const listVariables = {
      first: 25,
      unreadOnly: false,
      communityId: "community-1",
    };
    render(<NotificationsPage />, {
      mocks: [
        emptyPage(listVariables, "community"),
        {
          request: {
            query: MARK_ALL_NOTIFICATIONS_READ,
            variables: { communityId: "community-1" },
          },
          result: () => {
            markedFor("community-1");
            return { data: { markAllNotificationsRead: 0 } };
          },
        },
        emptyPage(listVariables, "community"),
      ],
    });

    await screen.findByText(/Nothing yet/);
    await user.click(screen.getByRole("button", { name: "Mark all read" }));

    await vi.waitFor(() =>
      expect(markedFor).toHaveBeenCalledWith("community-1"),
    );
  });

  it("can widen to every community from a community host", async () => {
    mocks.hostCommunity = {
      id: "community-1",
      name: "Willowmere",
      slug: "willowmere",
    };
    const user = userEvent.setup();
    render(<NotificationsPage />, {
      mocks: [
        emptyPage(
          { first: 25, unreadOnly: false, communityId: "community-1" },
          "community",
        ),
        emptyPage({ first: 25, unreadOnly: false }, "everything"),
      ],
    });

    await screen.findByText(/Nothing yet/);
    await user.click(screen.getByRole("button", { name: "Everywhere" }));

    await vi.waitFor(() =>
      expect(document.body.dataset.answered).toBe("everything"),
    );
  });
});
