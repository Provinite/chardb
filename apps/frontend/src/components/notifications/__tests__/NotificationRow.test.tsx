/**
 * One notification row: the person who caused it links to them, and the rest
 * of the row links to what it is about.
 */
import { describe, it, expect, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen, within } from "../../../__tests__/test-utils";
import {
  NotificationKind,
  NotificationSubjectType,
  type NotificationFieldsFragment,
} from "../../../graphql/notifications.graphql";
import { communityUrl } from "../../../lib/communityHost";
import { NotificationRow } from "../NotificationRow";

const doorKnock = (
  changes: Partial<NotificationFieldsFragment> = {},
): NotificationFieldsFragment => ({
  id: "n1",
  kind: NotificationKind.HalloweenDoorKnocked,
  createdAt: new Date().toISOString(),
  seenAt: null,
  readAt: null,
  actorLabel: null,
  subjectType: NotificationSubjectType.HalloweenDoorKnock,
  subjectId: "7",
  body: null,
  subjectName: null,
  count: null,
  amount: null,
  reason: null,
  reasonText: null,
  excerpt: null,
  candySlugs: ["candy-corn"],
  availabilityAdded: null,
  availabilityRemoved: null,
  priceChanged: null,
  price: null,
  actor: {
    id: "u2",
    username: "luther",
    displayName: "Luther",
    avatarImage: null,
  },
  community: { id: "c1", name: "Willowmere", slug: "willowmere" },
  ...changes,
});

const renderRow = (
  notification: NotificationFieldsFragment,
  onOpen = vi.fn(),
) => {
  const view = render(
    <NotificationRow notification={notification} onOpen={onOpen} />,
  );
  return { ...view, onOpen };
};

describe("NotificationRow", () => {
  it("links the knocker's name to their door", () => {
    renderRow(doorKnock());

    expect(
      screen.getByRole("link", { name: "Luther" }).getAttribute("href"),
    ).toBe(communityUrl("willowmere", "/members/luther"));
  });

  it("links the rest of the row to the candy board", () => {
    renderRow(doorKnock());

    expect(
      screen
        .getByRole("link", {
          name: "Luther knocked on your door and left you a candy",
        })
        .getAttribute("href"),
    ).toBe(communityUrl("willowmere", "/halloween/board"));
  });

  it("never puts a link inside another", () => {
    const { container } = renderRow(doorKnock());

    expect(container.querySelector("a a")).toBeNull();
  });

  it("opens the notification when the name is clicked", async () => {
    const { onOpen } = renderRow(doorKnock());

    await userEvent.click(screen.getByRole("link", { name: "Luther" }));

    expect(onOpen).toHaveBeenCalledOnce();
  });

  it("names a host who is not a user without linking them", () => {
    renderRow(
      doorKnock({
        kind: NotificationKind.HalloweenCandyTraded,
        subjectType: NotificationSubjectType.HalloweenCandyTrade,
        actor: null,
        actorLabel: "Host",
        count: 2,
        candySlugs: null,
      }),
    );

    const row = screen.getByTestId("notification-row");
    expect(within(row).getByText("Host").closest("a")).toBeNull();
  });

  it("is plain text when it goes nowhere", () => {
    renderRow(
      doorKnock({ actor: null, actorLabel: "system", subjectType: null }),
    );

    expect(screen.queryByRole("link")).toBeNull();
  });
});
