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

/**
 * Sets `inert` on every child of `<body>` except `keep`, and returns a function
 * that clears it again -- only where this call set it. `inert` set by someone
 * else (the navigation drawer, the boot screen) is theirs to clear.
 */
function inertOthers(keep: Element): () => void {
  const set: Element[] = [];
  for (const el of document.body.children) {
    if (el === keep || el.hasAttribute("inert")) continue;
    el.setAttribute("inert", "");
    set.push(el);
  }
  return () => {
    for (const el of set) el.removeAttribute("inert");
  };
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
    { open, onClose, children, "aria-label": ariaLabel, className },
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
      const restoreInert = inertOthers(layer);
      const unlockScroll = lockScroll();

      const target =
        dialog.querySelector<HTMLElement>("[data-autofocus]") ?? dialog;
      target.focus();

      setHasTitle(document.getElementById(titleId) !== null);

      return () => {
        stack.splice(stack.indexOf(layer), 1);
        restoreInert();
        unlockScroll();
        // Hidden by now (a drawer that closed, a breakpoint), focusing it would
        // drop focus to the top of the page instead.
        if (opener?.isConnected && (opener.checkVisibility?.() ?? true)) {
          opener.focus();
        }
      };
    }, [open, titleId]);

    useEffect(() => {
      if (!open) return;
      const onKeyDown = (e: KeyboardEvent) => {
        if (
          e.key !== "Escape" ||
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
          className={
            className ? `${styles.dialog} ${className}` : styles.dialog
          }
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
