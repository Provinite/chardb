import React from "react";
import styled, { css, keyframes } from "styled-components";
import {
  AlertCircle,
  Check,
  Circle,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import type { SaveStatus } from "./useCandyBoardSync";

/**
 * Whether the board on the page is the board that is saved, as a word and an
 * icon. Each change of state brings its icon in with a little pop, and while
 * saving the icon spins; with reduced motion asked for, neither moves.
 */

const STATES: Record<
  SaveStatus,
  { text: string; Icon: LucideIcon; spin?: boolean }
> = {
  saved: { text: "Saved", Icon: Check },
  unsaved: { text: "Unsaved changes", Icon: Circle },
  saving: { text: "Saving…", Icon: Loader2, spin: true },
  failed: { text: "Not saved", Icon: AlertCircle },
};

const LONGEST = Object.values(STATES).reduce(
  (longest, { text }) => (text.length > longest.length ? text : longest),
  "",
);

const popIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.4);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

const Indicator = styled.span<{ $status: SaveStatus }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme, $status }) =>
    $status === "saved"
      ? theme.colors.success
      : $status === "failed"
        ? theme.colors.error
        : theme.colors.warning};
`;

/**
 * As wide as the longest state's words, whichever is showing, so the header
 * does not reflow -- or wrap -- each time the state changes. The longest is
 * laid in the same grid cell, unseen, as generated content: it holds the
 * width without becoming part of the page's text.
 */
const Words = styled.span`
  display: inline-grid;

  > *,
  &::after {
    grid-area: 1 / 1;
  }

  &::after {
    content: "${LONGEST}";
    visibility: hidden;
  }
`;

const IconSlot = styled.span<{ $spin: boolean }>`
  display: inline-flex;
  animation: ${popIn} 180ms ease-out;

  svg {
    ${({ $spin }) =>
      $spin &&
      css`
        animation: ${spin} 900ms linear infinite;
      `}
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;

    svg {
      animation: none;
    }
  }
`;

export const SaveStatusIndicator: React.FC<{ status: SaveStatus }> = ({
  status,
}) => {
  const { text, Icon, spin: spinning = false } = STATES[status];
  return (
    <Indicator role="status" $status={status}>
      {/* Keyed by state, so each change mounts it afresh and it pops in. */}
      <IconSlot key={status} $spin={spinning} data-save-icon={status}>
        <Icon
          size={18}
          strokeWidth={2.5}
          aria-hidden
          fill={status === "unsaved" ? "currentColor" : "none"}
        />
      </IconSlot>
      <Words>
        <span>{text}</span>
      </Words>
    </Indicator>
  );
};
