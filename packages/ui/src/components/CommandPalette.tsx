import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Search } from "lucide-react";
import { scrollToElement } from "../motion/scroll";
import { DialogRoot } from "./Dialog";
import * as styles from "./CommandPalette.css";

interface PaletteContextValue {
  listId: string;
  label: string;
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  /** The options on screen, in order. */
  options: () => HTMLElement[];
  listRef: React.MutableRefObject<HTMLDivElement | null>;
  onClose: () => void;
}

const PaletteContext = createContext<PaletteContextValue | null>(null);

function usePalette(): PaletteContextValue {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error("CommandPalette part used outside its Root");
  return ctx;
}

const join = (...names: (string | undefined)[]) =>
  names.filter(Boolean).join(" ");

/** A plain click on a link, which leaves this page rather than opening a tab. */
const followsLink = (e: React.MouseEvent) =>
  e.button === 0 &&
  !e.ctrlKey &&
  !e.metaKey &&
  !e.shiftKey &&
  !e.altKey &&
  e.target instanceof Element &&
  e.target.closest("a[href]") !== null;

export interface CommandPaletteRootProps {
  open: boolean;
  onClose: () => void;
  /** The dialog's and the search box's accessible name. */
  "aria-label": string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * A search box over a list of results, in a dialog: type to narrow, arrow keys
 * to move, Enter to pick.
 *
 * Results are options of a listbox the box controls, and the active one is
 * announced through `aria-activedescendant`, so focus stays in the box while
 * the selection moves. A result can be any element through `as`: a link, so
 * the browser's own link handling (new tab, copy address) still works, or a
 * plain option that does something on click. Following a link closes the
 * palette; anything else leaves that to the caller.
 */
export const CommandPaletteRoot = forwardRef<
  HTMLDialogElement,
  CommandPaletteRootProps
>(function CommandPaletteRoot(
  { open, onClose, "aria-label": label, className, children },
  ref,
) {
  const listId = useId();
  const listRef = useRef<HTMLDivElement | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const options = useCallback(
    () => [
      ...(listRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ??
        []),
    ],
    [],
  );

  // Through a ref, so a caller passing a fresh function every render does not
  // change the context and re-render every result with it.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const close = useCallback(() => onCloseRef.current(), []);

  const ctx = useMemo(
    () => ({
      listId,
      label,
      activeId,
      setActiveId,
      options,
      listRef,
      onClose: close,
    }),
    [listId, label, activeId, options, close],
  );

  return (
    <DialogRoot
      ref={ref}
      open={open}
      onClose={onClose}
      aria-label={label}
      className={className}
    >
      <PaletteContext.Provider value={ctx}>{children}</PaletteContext.Provider>
    </DialogRoot>
  );
});

export type CommandPaletteInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "role" | "aria-controls" | "aria-activedescendant"
>;

/** The search box. Controlled by the caller, through `value` and `onChange`. */
export const CommandPaletteInput = forwardRef<
  HTMLInputElement,
  CommandPaletteInputProps
>(function CommandPaletteInput(
  { className, onChange, onKeyDown, ...rest },
  ref,
) {
  const { listId, label, activeId, setActiveId, options } = usePalette();

  const move = (by: 1 | -1) => {
    const all = options();
    if (all.length === 0) return;
    const at = all.findIndex((o) => o.id === activeId);
    const next = all[(at + by + all.length) % all.length];
    setActiveId(next.id);
    scrollToElement(next, { block: "nearest" });
  };

  return (
    <div className={styles.inputRow}>
      <Search size={20} aria-hidden className={styles.searchIcon} />
      <input
        ref={ref}
        type="text"
        role="combobox"
        aria-label={label}
        aria-expanded="true"
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeId ?? undefined}
        autoComplete="off"
        spellCheck={false}
        data-autofocus=""
        className={join(styles.input, className)}
        onChange={(e) => {
          // Back to the first result once the list has re-rendered.
          setActiveId(null);
          onChange?.(e);
        }}
        onKeyDown={(e) => {
          onKeyDown?.(e);
          if (e.defaultPrevented || e.nativeEvent.isComposing) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            move(1);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            move(-1);
          } else if (e.key === "Enter" && activeId) {
            e.preventDefault();
            const option = document.getElementById(activeId);
            // A synthetic click carries no modifiers, so a link asked for in
            // a new tab is opened as one here. The palette stays open, as it
            // does for a Ctrl-click.
            if (
              option instanceof HTMLAnchorElement &&
              option.href &&
              (e.ctrlKey || e.metaKey || e.shiftKey)
            ) {
              window.open(option.href, "_blank", "noopener");
              return;
            }
            option?.click();
          }
        }}
        {...rest}
      />
    </div>
  );
});

export type CommandPaletteListProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "role" | "id"
>;

/** The results. Holds `Group`s, or `Empty` when there are none. */
export const CommandPaletteList = forwardRef<
  HTMLDivElement,
  CommandPaletteListProps
>(function CommandPaletteList(
  { className, onClick, onMouseDown, onPointerMove, ...rest },
  ref,
) {
  const { listId, label, activeId, setActiveId, options, listRef, onClose } =
    usePalette();

  // After every render: the results may have changed under the active one.
  // With nothing active, or the active one gone, the first is active.
  useLayoutEffect(() => {
    const all = options();
    if (all.some((o) => o.id === activeId)) return;
    const first = all[0]?.id ?? null;
    if (first !== activeId) setActiveId(first);
  });

  return (
    <div
      ref={(el) => {
        listRef.current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
      }}
      id={listId}
      role="listbox"
      aria-label={label}
      className={join(styles.list, className)}
      onClick={(e) => {
        onClick?.(e);
        // Closes even for a link to the page already open, where the route
        // does not change.
        if (followsLink(e)) onClose();
      }}
      onMouseDown={(e) => {
        onMouseDown?.(e);
        // Results are never focused: pressing one would otherwise take focus
        // from the box, and with it the arrow keys and typing. The click that
        // follows still goes through.
        if (
          e.target instanceof Element &&
          e.target.closest('[role="option"]')
        ) {
          e.preventDefault();
        }
      }}
      onPointerMove={(e) => {
        onPointerMove?.(e);
        const option =
          e.target instanceof Element
            ? e.target.closest<HTMLElement>('[role="option"]')
            : null;
        if (option && option.id !== activeId) setActiveId(option.id);
      }}
      {...rest}
    />
  );
});

export interface CommandPaletteGroupProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "role"> {
  heading: React.ReactNode;
}

export const CommandPaletteGroup = forwardRef<
  HTMLDivElement,
  CommandPaletteGroupProps
>(function CommandPaletteGroup({ heading, className, children, ...rest }, ref) {
  const headingId = useId();
  return (
    <div
      ref={ref}
      role="group"
      aria-labelledby={headingId}
      className={join(styles.group, className)}
      {...rest}
    >
      <div id={headingId} className={styles.groupHeading}>
        {heading}
      </div>
      {children}
    </div>
  );
});

type ItemOwnProps<C extends React.ElementType> = {
  /** The element or component to render: `div` by default, or a link. */
  as?: C;
  className?: string;
  children?: React.ReactNode;
};

export type CommandPaletteItemProps<C extends React.ElementType = "div"> =
  ItemOwnProps<C> &
    Omit<
      React.ComponentPropsWithoutRef<C>,
      keyof ItemOwnProps<C> | "id" | "role" | "aria-selected" | "tabIndex"
    >;

/**
 * `forwardRef` loses the `as` generic, so the forwarded component is typed
 * back to it: the ref is whatever `as` renders.
 */
type ItemComponent = <C extends React.ElementType = "div">(
  props: CommandPaletteItemProps<C> & { ref?: React.Ref<React.ElementRef<C>> },
) => React.ReactElement | null;

/** One result. */
export const CommandPaletteItem = forwardRef(function CommandPaletteItem(
  {
    as,
    className,
    children,
    ...rest
  }: CommandPaletteItemProps<React.ElementType>,
  ref: React.ForwardedRef<Element>,
) {
  const id = useId();
  const { activeId } = usePalette();
  const Component: React.ElementType = as ?? "div";
  return (
    <Component
      {...rest}
      ref={ref}
      id={id}
      role="option"
      aria-selected={activeId === id}
      // Never a tab stop: the box keeps focus, and arrow keys move the
      // selection.
      tabIndex={-1}
      className={join(styles.item, className)}
    >
      {children}
    </Component>
  );
}) as ItemComponent;

/** A result's icon. Decorative: the label names the result. */
export const CommandPaletteItemIcon = forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(function CommandPaletteItemIcon({ className, ...rest }, ref) {
  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={join(styles.itemIcon, className)}
      {...rest}
    />
  );
});

/** Holds a result's label and description, beside its icon. */
export const CommandPaletteItemText = forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(function CommandPaletteItemText({ className, ...rest }, ref) {
  return (
    <span ref={ref} className={join(styles.itemText, className)} {...rest} />
  );
});

export const CommandPaletteItemLabel = forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(function CommandPaletteItemLabel({ className, ...rest }, ref) {
  return (
    <span ref={ref} className={join(styles.itemLabel, className)} {...rest} />
  );
});

export const CommandPaletteItemDescription = forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(function CommandPaletteItemDescription({ className, ...rest }, ref) {
  return (
    <span
      ref={ref}
      className={join(styles.itemDescription, className)}
      {...rest}
    />
  );
});

/** Stands in for the list when nothing matches. */
export const CommandPaletteEmpty = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function CommandPaletteEmpty({ className, ...rest }, ref) {
  return <div ref={ref} className={join(styles.empty, className)} {...rest} />;
});

/**
 * Keyboard hints under the list, from `sm` up. Hidden from screen readers,
 * which get the same from the combobox's role.
 */
export const CommandPaletteFooter = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function CommandPaletteFooter({ className, ...rest }, ref) {
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={join(styles.footer, className)}
      {...rest}
    />
  );
});

/** A key, in the footer's hints. */
export const CommandPaletteKbd = forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(function CommandPaletteKbd({ className, ...rest }, ref) {
  return <kbd ref={ref} className={join(styles.kbd, className)} {...rest} />;
});

export interface HighlightProps {
  text: string;
  /** Marked wherever it appears in `text`, ignoring case. Plain text. */
  match: string;
}

/** `text`, with every occurrence of `match` in a `<mark>`. */
export function Highlight({ text, match }: HighlightProps) {
  const needle = match.toLowerCase();
  if (!needle) return <>{text}</>;

  // Lower-casing can lengthen a character ("İ" becomes two code units), so
  // positions found in the lower-cased text are mapped back to the original:
  // each lower-cased code unit remembers where its character starts and ends.
  let haystack = "";
  const starts: number[] = [];
  const ends: number[] = [];
  let at = 0;
  for (const char of text) {
    const lower = char.toLowerCase();
    for (let i = 0; i < lower.length; i++) {
      starts.push(at);
      ends.push(at + char.length);
    }
    haystack += lower;
    at += char.length;
  }

  const parts: React.ReactNode[] = [];
  let from = 0;
  let searchFrom = 0;
  for (
    let found = haystack.indexOf(needle);
    found !== -1;
    found = haystack.indexOf(needle, searchFrom)
  ) {
    const start = starts[found];
    const end = ends[found + needle.length - 1];
    if (start > from) parts.push(text.slice(from, start));
    parts.push(
      <mark key={start} className={styles.mark}>
        {text.slice(start, end)}
      </mark>,
    );
    from = end;
    searchFrom = found + needle.length;
  }
  if (from < text.length) parts.push(text.slice(from));
  return <>{parts}</>;
}
