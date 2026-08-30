import { gql } from "@apollo/client";

// ==================== Fragments ====================

/**
 * Everything a notification row needs to render itself.
 *
 * The snapshot fields are flat and mostly null: which of them are set depends
 * on `kind`, and the client switches on that rather than on their presence.
 */
export const NOTIFICATION_FRAGMENT = gql`
  fragment NotificationFields on Notification {
    id
    kind
    createdAt
    seenAt
    readAt
    actorLabel
    subjectType
    subjectId
    body
    subjectName
    count
    amount
    reason
    excerpt
    actor {
      id
      username
      displayName
      avatarImage {
        id
        thumbnailUrl
        originalUrl
        altText
      }
    }
    community {
      id
      name
    }
  }
`;

// ==================== Queries ====================

export const NOTIFICATIONS_QUERY = gql`
  query Notifications($first: Int, $after: String, $unreadOnly: Boolean) {
    notifications(first: $first, after: $after, unreadOnly: $unreadOnly) {
      nodes {
        ...NotificationFields
      }
      totalCount
      hasNextPage
      hasPreviousPage
    }
  }
  ${NOTIFICATION_FRAGMENT}
`;

/**
 * Kept separate from the list on purpose: this is the one thing polled on a
 * timer, and it should drag nothing along with it.
 */
export const UNSEEN_NOTIFICATION_COUNT_QUERY = gql`
  query UnseenNotificationCount {
    unseenNotificationCount
  }
`;

// ==================== Mutations ====================

export const MARK_NOTIFICATIONS_SEEN = gql`
  mutation MarkNotificationsSeen {
    markNotificationsSeen
  }
`;

export const MARK_NOTIFICATIONS_READ = gql`
  mutation MarkNotificationsRead($ids: [ID!]!) {
    markNotificationsRead(ids: $ids)
  }
`;

export const MARK_ALL_NOTIFICATIONS_READ = gql`
  mutation MarkAllNotificationsRead {
    markAllNotificationsRead
  }
`;

export {
  useNotificationsQuery,
  useUnseenNotificationCountQuery,
  useMarkNotificationsSeenMutation,
  useMarkNotificationsReadMutation,
  useMarkAllNotificationsReadMutation,
  NotificationKind,
  NotificationSubjectType,
  type NotificationsQuery,
  type NotificationsQueryVariables,
  type UnseenNotificationCountQuery,
  type NotificationFieldsFragment,
  type Notification,
  type NotificationConnection,
} from "../generated/graphql";
