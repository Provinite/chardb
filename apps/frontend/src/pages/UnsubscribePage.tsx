import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import styled from "styled-components";
import { usePageMeta } from "../lib/pageMeta";
import { NotificationKind } from "../graphql/notifications.graphql";
import { useUnsubscribeFromNotificationEmailMutation } from "../graphql/notification-preferences.graphql";

/** What each kind's email is called, in a sentence confirming it is off. */
const KIND_LABELS: Partial<Record<NotificationKind, string>> = {
  [NotificationKind.ImageApproved]: "image approval",
  [NotificationKind.ImageRejected]: "image rejection",
  [NotificationKind.CommentReceived]: "comment",
  [NotificationKind.FollowReceived]: "new follower",
  [NotificationKind.ItemGranted]: "item",
  [NotificationKind.ItemRevoked]: "item removal",
  [NotificationKind.CurrencyReceived]: "currency",
  [NotificationKind.TradeOffered]: "trade offer",
  [NotificationKind.TradeAccepted]: "trade accepted",
  [NotificationKind.TradeDeclined]: "trade declined",
};

type Status = "working" | "done" | "failed";

/**
 * The page an email's unsubscribe link lands on.
 *
 * Unauthenticated by design: the token in the URL is the authorisation, and a
 * link that demanded a login would be useless to somebody reading mail on a
 * device they are not signed in on.
 *
 * It acts on load rather than asking for a confirming click. The person already
 * clicked something that said "unsubscribe"; making them click twice is the
 * pattern that gets a sender reported as spam instead. It only ever switches
 * one kind off, so there is nothing here that a mail client's link prefetch
 * could do that the reader did not already ask for.
 */
export const UnsubscribePage: React.FC = () => {
  usePageMeta({ title: "Unsubscribe" });

  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<Status>("working");
  const [kind, setKind] = useState<NotificationKind | null>(null);
  const [unsubscribe] = useUnsubscribeFromNotificationEmailMutation();
  // StrictMode mounts effects twice in development. The mutation is idempotent,
  // so a second call is harmless, but firing it is still noise.
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;

    void (async () => {
      try {
        const result = await unsubscribe({ variables: { input: { token } } });
        const payload = result.data?.unsubscribeFromNotificationEmail;
        if (payload?.success) {
          setKind(payload.kind ?? null);
          setStatus("done");
        } else {
          setStatus("failed");
        }
      } catch {
        setStatus("failed");
      }
    })();
  }, [token, unsubscribe]);

  if (!token) {
    return (
      <Container>
        <Card>
          <Title>That link is not valid</Title>
          <Description>
            This unsubscribe link is missing its token. Check that you copied
            the whole address out of the email.
          </Description>
          <Footer>
            <BackLink to="/">Go to CharDB</BackLink>
          </Footer>
        </Card>
      </Container>
    );
  }

  const label = kind ? KIND_LABELS[kind] : null;

  return (
    <Container>
      <Card>
        {status === "working" ? (
          <>
            <Title>Unsubscribing…</Title>
            <Description>One moment.</Description>
          </>
        ) : null}

        {status === "done" ? (
          <>
            <Title>You are unsubscribed</Title>
            <Description>
              {label
                ? `We will stop sending you ${label} emails.`
                : "We will stop sending you these emails."}{" "}
              Nothing else changed — your other notifications are untouched, and
              you will still see this in the app.
            </Description>
            <Description>
              Sign in to change any of your other notification settings.
            </Description>
            <Footer>
              <BackLink to="/profile/edit">Notification settings</BackLink>
            </Footer>
          </>
        ) : null}

        {status === "failed" ? (
          <>
            <Title>That link is not valid</Title>
            <Description>
              It may have been altered on its way here. You can change every
              notification setting from your profile once you are signed in.
            </Description>
            <Footer>
              <BackLink to="/profile/edit">Notification settings</BackLink>
            </Footer>
          </>
        ) : null}
      </Card>
    </Container>
  );
};

const Container = styled.div`
  max-width: 480px;
  margin: 2rem auto;
  padding: 0 ${({ theme }) => theme.spacing.md};
`;

const Card = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.spacing.xl};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  box-shadow: ${({ theme }) => theme.shadows.lg};
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize.xxl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Description = styled.p`
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Footer = styled.div`
  text-align: center;
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

const BackLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;
