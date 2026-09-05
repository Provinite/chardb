import React from "react";
import { Link, useLocation } from "react-router-dom";
import styled, { css } from "styled-components";
import { LucideIcon } from "lucide-react";

interface CommunityNavigationItemProps {
  /**
   * A path on this host, or an absolute URL. Communities now live on their own
   * hosts, so a sidebar entry can point at a different origin than the one it
   * is rendered on; an absolute `to` is rendered as an `<a>`, because the
   * router cannot navigate across origins.
   */
  to: string;
  icon?: LucideIcon;
  label: string;
  badge?: string | number;
  isNested?: boolean;
  disabled?: boolean;
}

const navItemStyles = css<{
  $isActive: boolean;
  $isNested?: boolean;
  $disabled?: boolean;
}>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme, $isNested }) =>
    $isNested
      ? `${theme.spacing.xs} ${theme.spacing.md} ${theme.spacing.xs} ${theme.spacing.xl}`
      : `${theme.spacing.xs} ${theme.spacing.md}`};
  color: ${({ theme, $isActive, $disabled }) =>
    $disabled
      ? theme.colors.text.muted
      : $isActive
        ? theme.colors.primary
        : theme.colors.text.primary};
  text-decoration: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  transition: all 0.2s ease;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme, $isActive }) =>
    $isActive
      ? theme.typography.fontWeight.medium
      : theme.typography.fontWeight.normal};
  background-color: ${({ theme, $isActive }) =>
    $isActive ? `${theme.colors.primary}15` : "transparent"};
  pointer-events: ${({ $disabled }) => ($disabled ? "none" : "auto")};
  cursor: ${({ $disabled }) => ($disabled ? "not-allowed" : "pointer")};

  &:hover {
    background-color: ${({ theme, $disabled }) =>
      $disabled ? "transparent" : theme.colors.surface};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  svg {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }
`;

const StyledNavItem = styled(Link)<{
  $isActive: boolean;
  $isNested?: boolean;
  $disabled?: boolean;
}>`
  ${navItemStyles}
`;

const StyledNavAnchor = styled.a<{
  $isActive: boolean;
  $isNested?: boolean;
  $disabled?: boolean;
}>`
  ${navItemStyles}
`;

const Label = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Badge = styled.span`
  padding: 2px 6px;
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  min-width: 20px;
  text-align: center;
`;

export const CommunityNavigationItem: React.FC<
  CommunityNavigationItemProps
> = ({ to, icon: Icon, label, badge, isNested = false, disabled = false }) => {
  const location = useLocation();
  // An absolute URL names another origin, so it is never the page we are on and
  // never a destination the router can reach.
  const isCrossHost = /^https?:\/\//.test(to);
  const isActive = !isCrossHost && location.pathname === to;

  const styleProps = {
    $isActive: isActive,
    $isNested: isNested,
    $disabled: disabled,
    "aria-current": isActive ? ("page" as const) : undefined,
    "aria-disabled": disabled,
  };

  const contents = (
    <>
      {Icon && <Icon />}
      <Label>{label}</Label>
      {badge !== undefined && <Badge>{badge}</Badge>}
    </>
  );

  return isCrossHost ? (
    <StyledNavAnchor href={to} {...styleProps}>
      {contents}
    </StyledNavAnchor>
  ) : (
    <StyledNavItem to={to} {...styleProps}>
      {contents}
    </StyledNavItem>
  );
};
