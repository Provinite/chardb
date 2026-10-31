import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useBreakpoint } from "@chardb/ui";
import * as styles from "./NavigationDrawer.css";

interface NavigationDrawerProps {
  /** Whether the drawer is open. Only means anything below `md`. */
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Holds the navigation sidebar: a column beside the page from `md`, and a
 * drawer that slides in from the left below it.
 *
 * Open, it is a modal dialog: focus moves to its close button, Escape and a
 * tap on the scrim close it, and the page behind stops scrolling. Focus goes
 * back to whatever opened it. Keeping focus inside is the caller's job,
 * because the caller owns the rest of the page and makes it `inert`.
 */
export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  open,
  onClose,
  children,
}) => {
  const isColumn = useBreakpoint("md");
  const modal = open && !isColumn;
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!modal) return;
    openerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    closeRef.current?.focus();
    const root = document.documentElement;
    root.classList.add(styles.scrollLock);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      root.classList.remove(styles.scrollLock);
      openerRef.current?.focus();
    };
  }, [modal]);

  return (
    <>
      <div
        className={styles.scrim}
        data-open={modal || undefined}
        data-testid="navigation-scrim"
        onClick={onClose}
      />
      <div
        className={styles.panel}
        data-open={modal || undefined}
        role={modal ? "dialog" : undefined}
        aria-modal={modal || undefined}
        aria-label={modal ? "Navigation" : undefined}
      >
        <div className={styles.closeRow}>
          <button
            ref={closeRef}
            type="button"
            className={styles.closeButton}
            aria-label="Close navigation"
            onClick={onClose}
          >
            <X size={20} aria-hidden />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </>
  );
};
