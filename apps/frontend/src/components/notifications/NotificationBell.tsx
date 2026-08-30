import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { Bell } from "lucide-react";
import {
  useNotificationsQuery,
  useUnseenNotificationCountQuery,
  useMarkNotificationsSeenMutation,
  useMarkNotificationsReadMutation,
} from "../../graphql/notifications.graphql";
import { NotificationRow } from "./NotificationRow";
import { useAuth } from "../../contexts/AuthContext";

/**
 * How often the badge asks the server whether anything happened.
 *
 * Five minutes, deliberately. The count is one indexed COUNT and would survive
 * far more frequent polling, but nothing here is urgent enough to justify the
 * traffic, and the refetch on window focus below covers the case that actually
 * matters -- someone coming back to the tab.
 */
const POLL_MS = 5 * 60 * 1000;

/** How many rows the dropdown shows before deferring to the feed page. */
const DROPDOWN_SIZE = 8;

const Wrapper = styled.div`
  position: relative;
`;

const BellButton = styled.button`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const Badge = styled.span`
  position: absolute;
  top: 0;
  right: 0;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.error};
  color: white;
  font-size: 0.625rem;
  font-weight: 700;
  line-height: 16px;
  text-align: center;
`;

const Panel = styled.div`
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  width: min(380px, calc(100vw - 2rem));
  max-height: 70vh;
  overflow-y: auto;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  z-index: 50;
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  font-weight: 600;
  font-size: 0.875rem;
`;

const PanelFooter = styled(Link)`
  display: block;
  padding: 0.75rem 1rem;
  text-align: center;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;
  border-top: 1px solid ${({ theme }) => theme.colors.border};

  &:hover {
    background: ${({ theme }) => theme.colors.background};
  }
`;

const Empty = styled.div`
  padding: 2rem 1rem;
  text-align: center;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

/**
 * The top-bar bell: an unseen count, and a dropdown of the most recent few.
 *
 * Seen and read are separate on purpose. Opening the dropdown clears the badge
 * -- the badge means "new since you last looked" -- while a notification stays
 * marked unread, and visibly so, until it is actually opened.
 */
export const NotificationBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const userId = user?.id;

  const { data: countData, refetch: refetchCount } =
    useUnseenNotificationCountQuery({
      skip: !userId,
      pollInterval: POLL_MS,
      // A backgrounded tab should cost nothing; this is Apollo's own switch for
      // that, and it resumes on its own when the tab comes back.
      skipPollAttempt: () => document.hidden,
      fetchPolicy: "cache-and-network",
    });

  const {
    data,
    loading,
    refetch: refetchList,
  } = useNotificationsQuery({
    variables: { first: DROPDOWN_SIZE },
    // Only fetched when the panel is opened: the badge is the thing on a timer.
    skip: !open,
  });

  const [markSeen] = useMarkNotificationsSeenMutation();
  const [markRead] = useMarkNotificationsReadMutation();

  const unseen = countData?.unseenNotificationCount ?? 0;
  const notifications = data?.notifications.nodes ?? [];

  // Coming back to the tab is the moment someone expects the badge to be
  // right, and it costs one query rather than a shorter interval.
  useEffect(() => {
    const onFocus = () => {
      void refetchCount();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refetchCount]);

  // The header outlives a login, so this component does not remount when the
  // session changes and nothing clears the Apollo cache on the way through.
  // Without this the badge shows the previous session's number until the poll
  // comes round -- zero for someone who just signed in, or worse, the count
  // belonging to whoever was signed in before them.
  useEffect(() => {
    if (userId) void refetchCount();
  }, [userId, refetchCount]);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const toggle = useCallback(async () => {
    const next = !open;
    setOpen(next);
    if (!next || unseen === 0) return;

    // Clearing the badge is the one write opening the panel performs. It is
    // fire-and-forget: failing to clear it costs a stale number, and blocking
    // the panel on a mutation to fix that would be the worse trade.
    try {
      await markSeen();
      await refetchCount();
    } catch {
      // Left deliberately silent -- the next poll corrects it.
    }
  }, [open, unseen, markSeen, refetchCount]);

  const onOpenRow = useCallback(
    (notification: { id: string; readAt?: string | null }) => {
      setOpen(false);
      if (notification.readAt) return;
      void markRead({ variables: { ids: [notification.id] } }).then(() => {
        void refetchList();
      });
    },
    [markRead, refetchList],
  );

  return (
    <Wrapper ref={wrapperRef}>
      <BellButton
        type="button"
        onClick={toggle}
        aria-label={
          unseen > 0 ? `Notifications, ${unseen} new` : "Notifications"
        }
        aria-expanded={open}
        data-testid="notification-bell"
      >
        <Bell size={18} />
        {unseen > 0 && (
          <Badge data-testid="notification-badge">
            {unseen > 99 ? "99+" : unseen}
          </Badge>
        )}
      </BellButton>

      {open && (
        <Panel
          role="dialog"
          aria-label="Notifications"
          data-testid="notification-panel"
        >
          <PanelHeader>Notifications</PanelHeader>
          {loading && notifications.length === 0 ? (
            <Empty>Loading…</Empty>
          ) : notifications.length === 0 ? (
            <Empty>Nothing yet.</Empty>
          ) : (
            notifications.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                onOpen={onOpenRow}
              />
            ))
          )}
          <PanelFooter to="/notifications" onClick={() => setOpen(false)}>
            See all notifications
          </PanelFooter>
        </Panel>
      )}
    </Wrapper>
  );
};
