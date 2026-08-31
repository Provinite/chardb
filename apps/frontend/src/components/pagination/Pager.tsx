import React from "react";
import styled from "styled-components";

const ResultsCount = styled.p`
  color: ${({ theme }) => theme.colors.text.muted};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const LoadMoreButton = styled.button`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.secondary};
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  &:disabled {
    background: ${({ theme }) => theme.colors.text.muted};
    cursor: not-allowed;
  }
`;

interface PagerProps {
  /** How many are on screen. */
  showing: number;
  /** How many there are in total, per the server. */
  total: number;
  /** Whether the server says there is more to ask for. */
  hasMore: boolean;
  /** True while the next page is in flight. */
  loadingMore: boolean;
  onLoadMore: () => void;
  /**
   * What is being counted, plural and lowercase: "characters", "comments".
   * Read aloud as "Showing 24 of 47 characters".
   */
  noun: string;
  /** Appended to the count, for a caller that has narrowed the list. */
  qualifier?: string;
  /** The list itself. */
  children: React.ReactNode;
}

/**
 * A paged list: how much of it you are seeing, the list, and a way to see more.
 *
 * The count is the part that earns this component. A list that stops at its
 * page size and says nothing does not look truncated, it looks complete --
 * which is exactly how "My Characters" hid people's characters from them
 * (#307), and how the shop's purchase panel hid purchases before it (#289).
 * Wrapping the list rather than exporting two loose pieces is what stops the
 * next page from shipping the button without the count.
 */
export const Pager: React.FC<PagerProps> = ({
  showing,
  total,
  hasMore,
  loadingMore,
  onLoadMore,
  noun,
  qualifier,
  children,
}) => (
  <>
    <ResultsCount data-testid="pager-count">
      Showing {showing} of {total} {noun}
      {qualifier}
    </ResultsCount>

    {children}

    {hasMore && (
      <LoadMoreButton
        onClick={onLoadMore}
        disabled={loadingMore}
        data-testid="pager-load-more"
      >
        {loadingMore ? "Loading..." : `Load More`}
      </LoadMoreButton>
    )}
  </>
);
