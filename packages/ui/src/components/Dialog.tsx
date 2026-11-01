import React, {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import * as styles from "./Dialog.css";

/**
 * The open dialogs, oldest first. Escape belongs to the last one, and each
 * makes everything outside itself inert, including the dialogs beneath it.
 */
const stack: HTMLElement[] = [];

/** How many dialogs hold the page's scroll. */
let scrollLocks = 0;

/** The `inert` the dialogs set, and so theirs to clear. */
const inertByDialogs = new Set<Element>();

/**
 * Makes every child of `<body>` except the top dialog inert, or none when no
 * dialog is open. Worked out from the whole stack each time rather than undone
 * per dialog, so a dialog closing under another leaves the page inert. `inert`
 * set by someone else (the navigation drawer, the boot screen) is theirs, and
 * left alone.
 */
function applyInert(): void {
  const top = stack[stack.length - 1];
  for (const el of [...inertByDialogs]) {
    if (!el.isConnected || el === top || !top) {
      el.removeAttribute("inert");
      inertByDialogs.delete(el);
    }
  }
  if (!top) return;
  for (const el of document.body.children) {
    if (el === top || el.hasAttribute("inert")) continue;
    el.setAttribute("inert", "");
    inertByDialogs.add(el);
  }
}

function lockScroll(): () => void {
  const root = document.documentElement;
  if (scrollLocks++ === 0) {
    // Keeps the scrollbar's space only if there was a scrollbar, so locking
    // the scroll moves nothing either way.
    const hadScrollbar = root.scrollHeight > root.clientHeight;
    root.classList.add(styles.scrollLock);
    if (hadScrollbar) root.classList.add(styles.keepGutter);
  }
  return () => {
    if (--scrollLocks === 0) {
      root.classList.remove(styles.scrollLock, styles.keepGutter);
    }
  };
}

const TitleIdContext = createContext<string | undefined>(undefined);

export interface DialogRootProps {
  open: boolean;
  /** Escape, or a click on the scrim. The caller closes it. */
  onClose: () => void;
  children?: React.ReactNode;
  /** The name, when there is no `Dialog.Title` to take it from. */
  "aria-label"?: string;
  /**
   * How wide it may grow: `wide` (`size.dialogWide`) for columns or a grid,
   * otherwise `size.dialog`.
   */
  width?: keyof typeof styles.width;
  className?: string;
}

/**
 * A modal dialog: a `<dialog>` on the modal layer above a scrim, rendered at
 * the end of `<body>`.
 *
 * Opened with `open`, not `showModal()`, so it stays on the layer scale: the
 * browser's top layer would sit above toasts. While open, everything else in
 * the body is inert, which is what keeps focus and screen readers inside.
 * Focus moves to the first `[data-autofocus]` element inside, or the dialog
 * itself, and goes back to whatever had it on close. Escape closes the top
 * dialog only.
 */
export const DialogRoot = forwardRef<HTMLDialogElement, DialogRootProps>(
  function DialogRoot(
    {
      open,
      onClose,
      children,
      "aria-label": ariaLabel,
      width = "default",
      className,
    },
    ref,
  ) {
    const titleId = useId();
    const [hasTitle, setHasTitle] = useState(false);
    const layerRef = useRef<HTMLDivElement>(null);
    const dialogRef = useRef<HTMLDialogElement | null>(null);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useLayoutEffect(() => {
      if (!open) return;
      const layer = layerRef.current;
      const dialog = dialogRef.current;
      if (!layer || !dialog) return;

      // Before the page goes inert, which would blur the opener.
      const opener =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;

      stack.push(layer);
      applyInert();
      const unlockScroll = lockScroll();

      const target =
        dialog.querySelector<HTMLElement>("[data-autofocus]") ?? dialog;
      target.focus();

      setHasTitle(document.getElementById(titleId) !== null);

      return () => {
        const wasTop = stack[stack.length - 1] === layer;
        stack.splice(stack.indexOf(layer), 1);
        applyInert();
        unlockScroll();
        // Only the top dialog hands focus back: under another, its opener is
        // inert. Hidden by now (a drawer that closed, a breakpoint), focusing
        // the opener would drop focus to the top of the page instead.
        if (
          wasTop &&
          opener?.isConnected &&
          (opener.checkVisibility?.() ?? true)
        ) {
          opener.focus();
        }
      };
    }, [open, titleId]);

    useEffect(() => {
      if (!open) return;
      const onKeyDown = (e: KeyboardEvent) => {
        // Handled already by something inside (a menu closing itself), or
        // cancelling a character being composed: neither closes the dialog.
        if (
          e.key !== "Escape" ||
          e.defaultPrevented ||
          e.isComposing ||
          stack[stack.length - 1] !== layerRef.current
        ) {
          return;
        }
        e.preventDefault();
        onCloseRef.current();
      };
      document.addEventListener("keydown", onKeyDown);
      return () => document.removeEventListener("keydown", onKeyDown);
    }, [open]);

    if (!open) return null;

    return createPortal(
      <div ref={layerRef} className={styles.layer}>
        <div
          className={styles.scrim}
          data-dialog-scrim=""
          onClick={() => onCloseRef.current()}
        />
        <dialog
          ref={(el) => {
            dialogRef.current = el;
            if (typeof ref === "function") ref(el);
            else if (ref) ref.current = el;
          }}
          open
          aria-modal="true"
          aria-label={ariaLabel}
          aria-labelledby={hasTitle ? titleId : undefined}
          tabIndex={-1}
          className={[styles.dialog, styles.width[width], className]
            .filter(Boolean)
            .join(" ")}
        >
          <TitleIdContext.Provider value={titleId}>
            {children}
          </TitleIdContext.Provider>
        </dialog>
      </div>,
      document.body,
    );
  },
);

export interface DialogTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement> {
  children?: React.ReactNode;
}

/** The dialog's heading, and its accessible name. */
export const DialogTitle = forwardRef<HTMLHeadingElement, DialogTitleProps>(
  function DialogTitle({ className, ...rest }, ref) {
    const id = useContext(TitleIdContext);
    return (
      <h2
        ref={ref}
        id={id}
        className={className ? `${styles.title} ${className}` : styles.title}
        {...rest}
      />
    );
  },
);

/** The dialog's content: padded, and scrolling when the dialog is capped. */
export const DialogBody = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function DialogBody({ className, ...rest }, ref) {
  return (
    <div
      ref={ref}
      className={className ? `${styles.body} ${className}` : styles.body}
      {...rest}
    />
  );
});
