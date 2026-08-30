import React, { useCallback, useState } from "react";
import styled from "styled-components";
import { Bell } from "lucide-react";
import { Button } from "@chardb/ui";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { NotificationRow } from "../components/notifications/NotificationRow";
import {
  useNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationsReadMutation,
} from "../graphql/notifications.graphql";

const PAGE_SIZE = 25;

const Container = styled.div`
  max-width: 720px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl} ${({ theme }) => theme.spacing.md};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  flex-wrap: wrap;
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize.xxl};
  margin: 0;
`;

const Filters = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const FilterTab = styled.button<{ $active: boolean }>`
  padding: 0.375rem 0.75rem;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.primary : theme.colors.border};
  background: ${({ theme, $active }) =>
    $active ? `${theme.colors.primary}18` : "transparent"};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};
  font-size: 0.8125rem;
  cursor: pointer;
`;

const List = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  overflow: hidden;
  background: ${({ theme }) => theme.colors.surface};
`;

const Empty = styled.div`
  padding: 4rem 1rem;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Footer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  min-height: 300px;
  align-items: center;
`;

/**
 * The whole notification history, as opposed to the dropdown's most recent few.
 *
 * Rows are the same component the dropdown uses, so the two cannot describe the
 * same event differently.
 */
export const NotificationsPage: React.FC = () => {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const { data, loading, error, refetch } = useNotificationsQuery({
    variables: { first: limit, unreadOnly },
    fetchPolicy: "cache-and-network",
  });

  const [markRead] = useMarkNotificationsReadMutation();
  const [markAllRead] = useMarkAllNotificationsReadMutation();

  const notifications = data?.notifications.nodes ?? [];
  const hasMore = data?.notifications.hasNextPage ?? false;
  const total = data?.notifications.totalCount ?? 0;

  const onOpenRow = useCallback(
    (notification: { id: string; readAt?: string | null }) => {
      if (notification.readAt) return;
      void markRead({ variables: { ids: [notification.id] } }).then(() => {
        void refetch();
      });
    },
    [markRead, refetch],
  );

  const onMarkAll = useCallback(() => {
    void markAllRead().then(() => {
      void refetch();
    });
  }, [markAllRead, refetch]);

  if (loading && !data) {
    return (
      <LoadingContainer>
        <LoadingSpinner />
      </LoadingContainer>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Notifications</Title>
        <Filters>
          <FilterTab
            type="button"
            $active={!unreadOnly}
            onClick={() => setUnreadOnly(false)}
          >
            All
          </FilterTab>
          <FilterTab
            type="button"
            $active={unreadOnly}
            onClick={() => setUnreadOnly(true)}
          >
            Unread
          </FilterTab>
          <Button variant="ghost" size="sm" onClick={onMarkAll}>
            Mark all read
          </Button>
        </Filters>
      </Header>

      {error ? (
        <Empty>
          <p>Those notifications could not be loaded. {error.message}</p>
        </Empty>
      ) : notifications.length === 0 ? (
        <Empty>
          <Bell size={36} style={{ opacity: 0.5, marginBottom: "0.75rem" }} />
          <p>
            {unreadOnly
              ? "Nothing unread."
              : "Nothing yet. Follows, comments, and anything staff sends you will show up here."}
          </p>
        </Empty>
      ) : (
        <List data-testid="notification-list">
          {notifications.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              onOpen={onOpenRow}
            />
          ))}
        </List>
      )}

      {hasMore && (
        <Footer>
          <Button
            variant="secondary"
            onClick={() => setLimit((n) => n + PAGE_SIZE)}
          >
            Load more ({notifications.length} of {total})
          </Button>
        </Footer>
      )}
    </Container>
  );
};
