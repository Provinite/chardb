import React from "react";
import styled, { css } from "styled-components";

/** A row of filter chips. */
export const FilterChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
`;

const Chip = styled.button<{ $active: boolean }>`
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
  padding: 0.3rem 0.75rem;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  cursor: pointer;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.secondary};
  transition:
    background 0.12s,
    border-color 0.12s,
    color 0.12s;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  ${({ $active, theme }) =>
    $active &&
    css`
      background: ${theme.colors.primary}1a;
      border-color: ${theme.colors.primary}55;
      color: ${theme.colors.primary};
      font-weight: 600;
    `}
`;

interface FilterChipProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  /** Whether this filter is on; also announced as pressed. */
  active: boolean;
}

/** A pill that turns a filter on or off, as on the item ledger. */
export const FilterChip: React.FC<FilterChipProps> = ({
  active,
  children,
  ...props
}) => (
  <Chip type="button" aria-pressed={active} $active={active} {...props}>
    {children}
  </Chip>
);
