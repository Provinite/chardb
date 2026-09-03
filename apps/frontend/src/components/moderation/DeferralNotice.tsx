import React from "react";
import styled from "styled-components";
import { Undo2 } from "lucide-react";
import { Caption } from "@chardb/ui";

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ theme }) => theme.colors.text.muted}20;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Detail = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.5rem 0.75rem;
  border-left: 3px solid ${({ theme }) => theme.colors.text.muted}40;
  background: ${({ theme }) => theme.colors.background};
  border-radius: 0 8px 8px 0;
`;

const Note = styled(Caption)`
  color: ${({ theme }) => theme.colors.text.primary};
  font-style: italic;
`;

interface DeferralInfo {
  deferralCount: number;
  deferredAt?: string | null;
  deferralNote?: string | null;
  deferredBy?: { username: string; displayName?: string | null } | null;
}

/**
 * The count badge, for the card header. Renders nothing for an entry nobody
 * has passed on, which is almost all of them.
 */
export const DeferralBadge: React.FC<{ deferralCount: number }> = ({
  deferralCount,
}) => {
  if (deferralCount < 1) return null;

  return (
    <Badge
      data-testid="deferral-badge"
      data-deferral-count={deferralCount}
      title={`Sent to the back of the queue ${deferralCount} ${
        deferralCount === 1 ? "time" : "times"
      }`}
    >
      <Undo2 size={11} />
      Deferred ×{deferralCount}
    </Badge>
  );
};

/**
 * Who passed on this entry and why. Separate from the badge because the two
 * belong in different parts of a card: the count reads as metadata next to
 * the other tags, the reason is a sentence and needs room to be one.
 */
export const DeferralDetail: React.FC<{
  info: DeferralInfo;
  formatTimeAgo: (dateString: string) => string;
}> = ({ info, formatTimeAgo }) => {
  if (info.deferralCount < 1) return null;

  const who = info.deferredBy?.displayName || info.deferredBy?.username;
  const when = info.deferredAt ? formatTimeAgo(info.deferredAt) : null;

  // Attribution alone is worth showing even with no note: the next moderator
  // can go ask that person, which is often the fastest way to unstick this.
  const attribution = [who && `passed on by ${who}`, when]
    .filter(Boolean)
    .join(", ");

  return (
    <Detail data-testid="deferral-detail">
      {info.deferralNote && <Note>“{info.deferralNote}”</Note>}
      {attribution && <Caption>{attribution}</Caption>}
    </Detail>
  );
};
