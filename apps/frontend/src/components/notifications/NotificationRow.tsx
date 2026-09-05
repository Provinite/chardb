import React from "react";
import styled from "styled-components";
import { Avatar } from "@chardb/ui";
import type { NotificationFieldsFragment } from "../../graphql/notifications.graphql";
import {
  notificationActorName,
  notificationHref,
  notificationSentence,
} from "./notification-display";

const Row = styled.div<{ $unread: boolean; $clickable: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  cursor: ${({ $clickable }) => ($clickable ? "pointer" : "default")};
  /* Unread is a tint rather than a dot, so a run of them reads as a block. */
  background: ${({ theme, $unread }) =>
    $unread ? `${theme.colors.primary}0d` : "transparent"};

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${({ theme }) => theme.colors.surface};
  }
`;

const Body = styled.div`
  min-width: 0;
  flex: 1;
`;

const Sentence = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.4;

  strong {
    font-weight: 600;
  }
`;

const Excerpt = styled.div`
  margin-top: 0.25rem;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const Meta = styled.div`
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Bare = styled.div`
  text-decoration: none;
  color: inherit;
`;

/**
 * An `<a>` and not a `<Link>`: `notificationHref` answers with an absolute URL,
 * and most of them are on a community host the router cannot navigate to.
 */
const RowLink = styled.a`
  text-decoration: none;
  color: inherit;
  display: block;
`;

/** "3 minutes ago", down to a date once it stops being useful as an interval. */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export interface NotificationRowProps {
  notification: NotificationFieldsFragment;
  /** Called when the row is activated, whether or not it links anywhere. */
  onOpen?: (notification: NotificationFieldsFragment) => void;
}

/**
 * One notification, shared by the dropdown and the feed page so the two cannot
 * describe the same event differently.
 */
export const NotificationRow: React.FC<NotificationRowProps> = ({
  notification,
  onOpen,
}) => {
  const href = notificationHref(notification);
  const actorName = notificationActorName(notification);

  const inner = (
    <Row
      $unread={!notification.readAt}
      $clickable={Boolean(href)}
      data-testid="notification-row"
      data-kind={notification.kind}
      data-unread={notification.readAt ? "false" : "true"}
      onClick={() => onOpen?.(notification)}
    >
      <Avatar
        image={notification.actor?.avatarImage}
        name={actorName}
        size={36}
      />
      <Body>
        <Sentence>
          <strong>{actorName}</strong> {notificationSentence(notification)}
        </Sentence>
        {notification.excerpt && <Excerpt>{notification.excerpt}</Excerpt>}
        {notification.body && <Excerpt>{notification.body}</Excerpt>}
        <Meta>
          {notification.community ? `${notification.community.name} · ` : ""}
          {relativeTime(notification.createdAt)}
        </Meta>
      </Body>
    </Row>
  );

  // A notification whose subject has no page, or whose subject is gone, is
  // still worth showing -- it just stops being a link.
  return href ? <RowLink href={href}>{inner}</RowLink> : <Bare>{inner}</Bare>;
};
