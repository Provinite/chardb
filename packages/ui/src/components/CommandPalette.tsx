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
  listRef: React.RefObject<HTMLDivElement>;
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
  const listRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const options = useCallback(
    () => [
      ...(listRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ??
        []),
    ],
    [],
  );

  const ctx = useMemo(
    () => ({
      listId,
      label,
      activeId,
      setActiveId,
      options,
      listRef,
      onClose,
    }),
    [listId, label, activeId, options, onClose],
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
            document.getElementById(activeId)?.click();
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
  { className, onClick, onPointerMove, ...rest },
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
        (listRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
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

/** One result. */
export function CommandPaletteItem<C extends React.ElementType = "div">({
  as,
  className,
  children,
  ...rest
}: CommandPaletteItemProps<C>) {
  const id = useId();
  const { activeId } = usePalette();
  const Component: React.ElementType = as ?? "div";
  return (
    <Component
      {...rest}
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
}

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

export interface HighlightProps {
  text: string;
  /** Marked wherever it appears in `text`, ignoring case. Plain text. */
  match: string;
}

/** `text`, with every occurrence of `match` in a `<mark>`. */
export function Highlight({ text, match }: HighlightProps) {
  const needle = match.toLowerCase();
  if (!needle) return <>{text}</>;

  const haystack = text.toLowerCase();
  const parts: React.ReactNode[] = [];
  let from = 0;
  for (
    let at = haystack.indexOf(needle);
    at !== -1;
    at = haystack.indexOf(needle, from)
  ) {
    if (at > from) parts.push(text.slice(from, at));
    parts.push(
      <mark key={at} className={styles.mark}>
        {text.slice(at, at + needle.length)}
      </mark>,
    );
    from = at + needle.length;
  }
  if (from < text.length) parts.push(text.slice(from));
  return <>{parts}</>;
}
