import React, {
  Children,
  cloneElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import styled, { css } from "styled-components";
import { vars } from "../theme/contract.css";
import { useAnchoredPosition } from "../hooks/useAnchoredPosition";
import { usePressOutside } from "./floating";
import { usePortalContainer } from "./portal";

/**
 * Menu - a "⋯" button that opens a short list of actions.
 *
 * For actions that should be one deliberate step away rather than a button on
 * the page: staff actions on a member-facing page, or anything that does not
 * fit an action bar at phone width. Items can sit in labelled groups, so a
 * "Staff actions" heading says whose controls they are.
 *
 * The list renders into `document.body`, or into the dialog it opened in,
 * so a card with `overflow: hidden` cannot clip it. React events still bubble through the portal to the
 * component tree, so a wrapper that stops propagation still sees them.
 *
 * Follows the WAI-ARIA menu button pattern: opening focuses the first item,
 * arrow keys move (and wrap), Home/End jump, Enter selects, Escape closes and
 * returns focus to the button. Tab closes too, from the button rather than
 * from the end of the document, where the portal puts the list.
 *
 * @example
 * ```tsx
 * <Menu label="More actions">
 *   <MenuGroup label="Staff actions">
 *     <MenuItem onSelect={kick}>Remove from Species</MenuItem>
 *     <MenuItem danger onSelect={remove}>Delete Character</MenuItem>
 *   </MenuGroup>
 * </Menu>
 * ```
 */

export interface MenuProps {
  /** The button's accessible name, such as "More actions". */
  label: string;
  /** What the button shows. Defaults to "⋯". */
  trigger?: React.ReactNode;
  children: React.ReactNode;
  testId?: string;
  disabled?: boolean;
  /**
   * `outlined` (the default) is the bordered "⋯" button. `ghost` has no
   * border and the comfortable touch size, for a trigger that shows content of
   * its own, such as an avatar.
   */
  appearance?: "outlined" | "ghost";
}

export interface MenuGroupProps {
  /** Shown as the group's heading, and its accessible name. */
  label: string;
  children: React.ReactNode;
}

export interface MenuItemProps {
  onSelect: () => void;
  children: React.ReactNode;
  /** Coloured as destructive. */
  danger?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  testId?: string;
}

const MenuContext = createContext<{
  /** Closes and gives focus back to the button. */
  close: () => void;
  /** Closes and leaves focus alone, for an item that navigates away. */
  dismiss: () => void;
} | null>(null);

const Trigger = styled.button<{ $appearance: "outlined" | "ghost" }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.sm};
  min-width: ${({ $appearance }) =>
    $appearance === "ghost" ? vars.size.target.comfortable : "2rem"};
  ${({ $appearance }) =>
    $appearance === "ghost"
      ? `min-height: ${vars.size.target.comfortable};`
      : "height: 2rem;"}
  padding: 0 ${({ theme }) => theme.spacing.sm};
  background: transparent;
  border: ${({ $appearance, theme }) =>
    $appearance === "ghost" ? "none" : `1px solid ${theme.colors.border}`};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  line-height: 1;
  cursor: pointer;

  &:hover:not(:disabled),
  &[aria-expanded="true"] {
    background-color: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const List = styled.div`
  position: fixed;
  /* The popovers' layer: one opened inside a popover renders after it, so
     paints above it. */
  z-index: ${vars.layer.dropdown.base};
  min-width: 12rem;
  max-width: calc(100vw - 16px);
  padding: ${({ theme }) => theme.spacing.xs} 0;
  background-color: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  box-shadow: ${({ theme }) => theme.shadows.lg};
`;

const Group = styled.div`
  & + &,
  [role="menuitem"] + & {
    margin-top: ${({ theme }) => theme.spacing.xs};
    padding-top: ${({ theme }) => theme.spacing.xs};
    border-top: 1px solid ${({ theme }) => theme.colors.border};
  }
`;

const GroupLabel = styled.div`
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.md}`};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text.muted};
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

const itemStyles = css<{ $danger?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  width: 100%;
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
  background: transparent;
  border: none;
  text-align: left;
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme, $danger }) =>
    $danger ? theme.colors.danger : theme.colors.text.primary};
  cursor: pointer;

  &:hover,
  &:focus {
    outline: none;
    background-color: ${({ theme }) => theme.colors.surface};
  }

  &[aria-disabled="true"] {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Item = styled.button<{ $danger?: boolean }>`
  ${itemStyles}
`;

/** The props a link item hands to the caller's link element. */
interface LinkSlotProps {
  className?: string;
  role?: string;
  tabIndex?: number;
  onClick?: React.MouseEventHandler<HTMLElement>;
}

/**
 * Passes the menu item's props to its one child instead of rendering an
 * element of its own, so the child stays the caller's own link.
 */
const LinkSlot: React.FC<
  LinkSlotProps & { children: React.ReactElement<LinkSlotProps> }
> = ({ children, className, onClick, ...rest }) => {
  const link = Children.only(children);
  return cloneElement(link, {
    ...rest,
    className: [link.props.className, className].filter(Boolean).join(" "),
    onClick: (e: React.MouseEvent<HTMLElement>) => {
      link.props.onClick?.(e);
      onClick?.(e);
    },
  });
};

const LinkItem = styled(LinkSlot)<{ $danger?: boolean }>`
  ${itemStyles}
  text-decoration: none;
`;

const GAP_PX = 4;

export const Menu: React.FC<MenuProps> = ({
  label,
  trigger = "⋯",
  children,
  testId,
  disabled = false,
  appearance = "outlined",
}) => {
  const [open, setOpen] = useState(false);
  const container = usePortalContainer();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const items = () =>
    Array.from(
      listRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  // Right-aligned to the button, but kept on-screen at both sides: a button
  // near the left edge would otherwise push the list off it. Opens upward
  // when it would run off the bottom of the viewport -- a button at the foot
  // of the screen is common, and a list below the fold cannot be reached.
  // Follows the button when the page scrolls rather than closing.
  useAnchoredPosition(triggerRef, listRef, open, {
    side: "bottom",
    align: "end",
    gap: GAP_PX,
    margin: GAP_PX,
    // Straight to the element, so following a scroll re-renders nothing.
    apply: ({ top, left }) => {
      const list = listRef.current;
      if (!list) return;
      list.style.top = `${top}px`;
      list.style.left = `${left}px`;
    },
  });

  // preventScroll: the list is fixed, and scrolling the page to reach it
  // would only move the button away.
  useEffect(() => {
    if (open) items()[0]?.focus({ preventScroll: true });
  }, [open]);

  const pressInside = usePressOutside(open, () => close(false), [triggerRef]);

  const context = useMemo(
    () => ({ close: () => close(true), dismiss: () => close(false) }),
    [close],
  );

  const onListKeyDown = (e: React.KeyboardEvent) => {
    const all = items();
    const index = all.indexOf(document.activeElement as HTMLElement);
    const focusAt = (i: number) =>
      all[(i + all.length) % all.length]?.focus({ preventScroll: true });

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        focusAt(index + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusAt(index - 1);
        break;
      case "Home":
        e.preventDefault();
        focusAt(0);
        break;
      case "End":
        e.preventDefault();
        focusAt(all.length - 1);
        break;
      case "Escape":
        e.preventDefault();
        close(true);
        break;
      case "Tab":
        e.preventDefault();
        close(true);
        break;
    }
  };

  const onTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" && !open) {
      e.preventDefault();
      setOpen(true);
    }
  };

  return (
    <>
      <Trigger
        ref={triggerRef}
        $appearance={appearance}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        disabled={disabled}
        data-testid={testId}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onTriggerKeyDown}
      >
        {trigger}
      </Trigger>
      {open &&
        createPortal(
          <MenuContext.Provider value={context}>
            <List
              ref={listRef}
              id={listId}
              role="menu"
              aria-label={label}
              onKeyDown={onListKeyDown}
              onMouseDownCapture={pressInside.onMouseDownCapture}
            >
              {children}
            </List>
          </MenuContext.Provider>,
          container,
        )}
    </>
  );
};

export const MenuGroup: React.FC<MenuGroupProps> = ({ label, children }) => {
  const labelId = useId();
  return (
    <Group role="group" aria-labelledby={labelId}>
      <GroupLabel id={labelId} role="presentation">
        {label}
      </GroupLabel>
      {children}
    </Group>
  );
};

export const MenuItem: React.FC<MenuItemProps> = ({
  onSelect,
  children,
  danger = false,
  disabled = false,
  icon,
  testId,
}) => {
  const menu = useContext(MenuContext);
  return (
    <Item
      type="button"
      role="menuitem"
      tabIndex={-1}
      $danger={danger}
      aria-disabled={disabled || undefined}
      data-testid={testId}
      onClick={() => {
        if (disabled) return;
        menu?.close();
        onSelect();
      }}
    >
      {icon}
      {children}
    </Item>
  );
};

export interface MenuLinkItemProps {
  /**
   * One link element, such as a router link, with its own destination. It
   * stays a real link, so Ctrl-click, middle-click and "open in new tab" work
   * on it as they do anywhere else.
   */
  children: React.ReactElement<LinkSlotProps>;
}

/**
 * A menu item that goes somewhere: the caller's link, given the menu item's
 * role and styles. Following it closes the menu; focus goes with the page,
 * so it is not handed back to the button.
 */
export const MenuLinkItem: React.FC<MenuLinkItemProps> = ({ children }) => {
  const menu = useContext(MenuContext);
  return (
    <LinkItem role="menuitem" tabIndex={-1} onClick={() => menu?.dismiss()}>
      {children}
    </LinkItem>
  );
};
