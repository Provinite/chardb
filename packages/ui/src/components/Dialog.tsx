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
import { X } from "lucide-react";
import { tabbables } from "./floating";
import { IconButton } from "./IconButton";
import { INERT_EXEMPT, PortalContainerContext } from "./portal";

/** On the close button, so initial focus can pass it by. */
const CLOSE_ATTR = "data-dialog-close";

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
 * left alone. So is anything marked `data-inert-exempt`: the toasts, which
 * must stay clickable over a dialog.
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
    if (
      el === top ||
      el.hasAttribute("inert") ||
      el.hasAttribute(INERT_EXEMPT)
    ) {
      continue;
    }
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
  /** Escape or the close button, or a scrim click when allowed. The caller closes it. */
  onClose: () => void;
  /**
   * Also close on a click on the scrim. For light pickers such as the command
   * palette only: a dialog holding a form or a decision would lose the work
   * to a stray click.
   */
  closeOnScrimClick?: boolean;
  children?: React.ReactNode;
  /** The name, when there is no `Dialog.Title` to take it from. */
  "aria-label"?: string;
  /**
   * How wide it may grow: `wide` (`size.dialogWide`) for columns or a grid,
   * otherwise `size.dialog`.
   */
  width?: keyof typeof styles.width;
  className?: string;
  /** On the `<dialog>`, for tests to find it by. */
  "data-testid"?: string;
}

/**
 * A modal dialog: a `<dialog>` on the modal layer above a scrim, rendered at
 * the end of `<body>`.
 *
 * Opened with `open`, not `showModal()`, so it stays on the layer scale: the
 * browser's top layer would sit above toasts. While open, everything else in
 * the body is inert, which is what keeps focus and screen readers inside.
 * Focus moves to the first `[data-autofocus]` element inside, else its first
 * control, else the dialog itself, and goes back to whatever had it on close.
 * Escape closes the top dialog only, as does the close button in its corner.
 */
export const DialogRoot = forwardRef<HTMLDialogElement, DialogRootProps>(
  function DialogRoot(
    {
      open,
      onClose,
      closeOnScrimClick = false,
      children,
      "aria-label": ariaLabel,
      width = "default",
      className,
      "data-testid": testId,
    },
    ref,
  ) {
    const titleId = useId();
    const [hasTitle, setHasTitle] = useState(false);
    // State rather than a ref: it is the portal container for what opens
    // inside, which needs it at render time.
    const [layer, setLayer] = useState<HTMLDivElement | null>(null);
    const dialogRef = useRef<HTMLDialogElement | null>(null);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useLayoutEffect(() => {
      if (!open) return;
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

      // What asked for focus, else the first control, else the dialog: a
      // keyboard user lands where they can act at once. Never the close
      // button, which would make Enter close what just opened.
      const target =
        dialog.querySelector<HTMLElement>("[data-autofocus]") ??
        tabbables(dialog).find((el) => !el.hasAttribute(CLOSE_ATTR)) ??
        dialog;
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
    }, [open, layer, titleId]);

    useEffect(() => {
      if (!open) return;
      const onKeyDown = (e: KeyboardEvent) => {
        // Handled already by something inside (a menu closing itself), or
        // cancelling a character being composed: neither closes the dialog.
        if (
          e.key !== "Escape" ||
          e.defaultPrevented ||
          e.isComposing ||
          !layer ||
          stack[stack.length - 1] !== layer
        ) {
          return;
        }
        e.preventDefault();
        onCloseRef.current();
      };
      document.addEventListener("keydown", onKeyDown);
      return () => document.removeEventListener("keydown", onKeyDown);
    }, [open, layer]);

    if (!open) return null;

    // Always the body, never the portal container of a dialog this one opened
    // from: the dialogs must be children of `<body>` for each to make the
    // others inert.
    return createPortal(
      <div ref={setLayer} className={styles.layer}>
        <div
          className={styles.scrim}
          data-dialog-scrim=""
          onClick={closeOnScrimClick ? () => onCloseRef.current() : undefined}
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
          data-testid={testId}
          tabIndex={-1}
          className={[styles.dialog, styles.width[width], className]
            .filter(Boolean)
            .join(" ")}
        >
          {/* First, as it is drawn in the top corner; skipped when focus
              first moves in. */}
          <IconButton
            label="Close"
            tone="ghost"
            icon={<X size={20} aria-hidden />}
            className={styles.close}
            onClick={() => onCloseRef.current()}
            data-dialog-close=""
          />
          <TitleIdContext.Provider value={titleId}>
            <PortalContainerContext.Provider value={layer}>
              {children}
            </PortalContainerContext.Provider>
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

export type DialogBodyProps = React.HTMLAttributes<HTMLDivElement>;

/** The dialog's content: padded, and scrolling when the dialog is capped. */
export const DialogBody = forwardRef<HTMLDivElement, DialogBodyProps>(
  function DialogBody({ className, ...rest }, ref) {
    return (
      <div
        ref={ref}
        className={className ? `${styles.body} ${className}` : styles.body}
        {...rest}
      />
    );
  },
);
