import React from "react";
import { Avatar } from "@chardb/ui";
import { HostAwareLink } from "../HostAwareLink";
import { CandyStrip } from "../halloween/CandyStrip";
import type { NotificationFieldsFragment } from "../../graphql/notifications.graphql";
import {
  notificationActorHref,
  notificationActorName,
  notificationHref,
  notificationSentence,
} from "./notification-display";
import * as styles from "./NotificationRow.css";

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
 *
 * Two links: the actor's avatar and name go to them, and the rest of the row
 * goes to what the notification is about. Both are `HostAwareLink`s, because
 * `notificationHref` answers with an absolute URL that is MOSTLY on a community
 * host the router cannot reach -- but not always: the bell renders on every
 * host, so a notification about the community you are on points at this
 * origin, and reloading the app to follow it would be waste.
 */
export const NotificationRow: React.FC<NotificationRowProps> = ({
  notification,
  onOpen,
}) => {
  const href = notificationHref(notification);
  const actorHref = notificationActorHref(notification);
  const actorName = notificationActorName(notification);
  const sentence = notificationSentence(notification);

  const avatar = (
    <Avatar
      image={notification.actor?.avatarImage}
      name={actorName}
      size={36}
    />
  );

  return (
    <div
      className={styles.row({
        unread: !notification.readAt,
        clickable: Boolean(href),
      })}
      data-testid="notification-row"
      data-kind={notification.kind}
      data-unread={notification.readAt ? "false" : "true"}
      onClick={() => onOpen?.(notification)}
    >
      {actorHref ? (
        // The name beside it is the same link, for keyboards and screen
        // readers; this one is for tapping the face.
        <HostAwareLink
          to={actorHref}
          className={styles.avatarLink}
          aria-hidden
          tabIndex={-1}
        >
          {avatar}
        </HostAwareLink>
      ) : (
        avatar
      )}
      <div className={styles.body}>
        <div className={styles.sentence}>
          {actorHref ? (
            <HostAwareLink to={actorHref} className={styles.actorLink}>
              {actorName}
            </HostAwareLink>
          ) : (
            <strong className={styles.actorName}>{actorName}</strong>
          )}{" "}
          {href ? (
            <HostAwareLink to={href} className={styles.subjectLink}>
              {sentence}
            </HostAwareLink>
          ) : (
            sentence
          )}
        </div>
        {notification.candySlugs && notification.candySlugs.length > 0 && (
          <CandyStrip slugs={notification.candySlugs} />
        )}
        {notification.excerpt && (
          <div className={styles.excerpt}>{notification.excerpt}</div>
        )}
        {notification.body && (
          <div className={styles.excerpt}>{notification.body}</div>
        )}
        <div className={styles.meta}>
          {notification.community ? `${notification.community.name} · ` : ""}
          {relativeTime(notification.createdAt)}
        </div>
      </div>
    </div>
  );
};
