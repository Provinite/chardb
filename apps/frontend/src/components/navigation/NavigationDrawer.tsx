import React, { useEffect, useLayoutEffect, useRef } from "react";
import { X } from "lucide-react";
import { IconButton } from "@chardb/ui";
import * as styles from "./NavigationDrawer.css";

interface NavigationDrawerProps {
  /**
   * Whether the drawer is open, and so modal. The caller keeps it closed from
   * `md`, where the sidebar is a column beside the page.
   */
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/** A plain click on a link, which leaves this page rather than opening a tab. */
const followsLink = (e: React.MouseEvent) =>
  e.button === 0 &&
  !e.ctrlKey &&
  !e.metaKey &&
  !e.shiftKey &&
  !e.altKey &&
  e.target instanceof Element &&
  e.target.closest("a[href]") !== null;

/**
 * Holds the navigation sidebar: a column beside the page from `md`, and a
 * drawer that slides in from the left below it.
 *
 * Open, it is a modal dialog: focus moves to its close button, and Escape, a
 * tap on the scrim, or following one of its links closes it. The page behind
 * stops scrolling. Focus goes back to whatever opened it. Keeping focus inside
 * is the caller's job, because the caller owns the rest of the page and makes
 * it `inert`.
 */
export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  open,
  onClose,
  children,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Before the caller's layout effect makes the page inert, which would blur
  // the menu button that opened the drawer. Child layout effects run first.
  useLayoutEffect(() => {
    if (!open) return;
    openerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const root = document.documentElement;
    // Keeps the scrollbar's space only if there was a scrollbar, so locking
    // the scroll moves nothing either way.
    const hadScrollbar = root.scrollHeight > root.clientHeight;
    root.classList.add(styles.scrollLock);
    if (hadScrollbar) root.classList.add(styles.keepGutter);

    // Only while focus is in the drawer: an Escape from a dialog opened out of
    // it, such as the page search, is that dialog's.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && panelRef.current?.contains(e.target as Node)) {
        onCloseRef.current();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      root.classList.remove(styles.scrollLock, styles.keepGutter);
      const opener = openerRef.current;
      // From `md` the menu button is hidden; focusing it would drop focus to
      // the top of the page instead.
      if (opener?.isConnected && (opener.checkVisibility?.() ?? true)) {
        opener.focus();
      }
    };
  }, [open]);

  return (
    <>
      <div
        className={styles.scrim}
        data-open={open || undefined}
        data-testid="navigation-scrim"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={styles.panel}
        data-open={open || undefined}
        role={open ? "dialog" : undefined}
        aria-modal={open || undefined}
        aria-label={open ? "Navigation" : undefined}
        // Closes even for a link to the page already open, where the route
        // does not change.
        onClick={(e) => {
          if (open && followsLink(e)) onClose();
        }}
      >
        <div className={styles.closeRow}>
          <IconButton
            ref={closeRef}
            label="Close navigation"
            icon={<X size={20} aria-hidden />}
            onClick={onClose}
          />
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </>
  );
};
