import React, {
  Children,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Check, ChevronDown } from "lucide-react";
import { cx } from "../layout/element";
import { scrollToElement } from "../motion/scroll";
import { AnchoredList } from "./AnchoredList";
import { usePressOutside } from "./floating";
import * as styles from "./Select.css";

/**
 * Select - picks one option from a short list, like a native `<select>`, but
 * each option can show more than text: a colour swatch beside a trait value's
 * name, say. The closed box shows the chosen option exactly as the list does.
 *
 * Follows the WAI-ARIA select-only combobox pattern. Focus stays on the box;
 * the arrow keys, Home and End move through the open list, Enter or Space
 * picks, Escape closes without picking (and keeps a dialog around it open),
 * and a typed letter jumps to the next option starting with it.
 *
 * Options are `Select.Option` children of `Select.Root`, directly or in an
 * array.
 *
 * @example
 * ```tsx
 * <Select.Root aria-labelledby={labelId} value={id} onChange={setId}>
 *   <Select.Option value="">Select rarity...</Select.Option>
 *   {values.map((v) => (
 *     <Select.Option key={v.id} value={v.id} textValue={v.name}>
 *       <ColorPip color={v.hex} /> {v.name}
 *     </Select.Option>
 *   ))}
 * </Select.Root>
 * ```
 */

export interface SelectRootProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    "value" | "onChange" | "children" | "type" | "role"
  > {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}

export interface SelectOptionProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "id" | "role"> {
  value: string;
  /**
   * What a typed letter matches against. Only needed when the children are
   * not plain text.
   */
  textValue?: string;
  children: React.ReactNode;
}

interface OptionContext {
  baseId: string;
  activeIndex: number;
  selectedValue: string;
  setActive: (index: number) => void;
  choose: (value: string) => void;
}

const SelectContext = createContext<OptionContext | null>(null);
const IndexContext = createContext(-1);

/** The text of a node tree, for matching typed letters. */
const textOf = (node: React.ReactNode): string => {
  if (typeof node === "string" || typeof node === "number") return `${node}`;
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: React.ReactNode }>(node)) {
    return textOf(node.props.children);
  }
  return "";
};

const optionId = (baseId: string, index: number) => `${baseId}-option-${index}`;

const Root = forwardRef<HTMLButtonElement, SelectRootProps>(function Root(
  {
    value,
    onChange,
    children,
    disabled,
    className,
    onKeyDown,
    onClick,
    ...rest
  },
  ref,
) {
  const baseId = useId();
  const listId = `${baseId}-list`;
  const boxRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const options = Children.toArray(children).filter(
    (child): child is React.ReactElement<SelectOptionProps> =>
      isValidElement<SelectOptionProps>(child) && child.type === Option,
  );
  const selectedIndex = options.findIndex((o) => o.props.value === value);
  const selected = options[selectedIndex];

  const close = () => {
    setOpen(false);
    setActiveIndex(-1);
  };
  const pressInside = usePressOutside(open, close);

  // A box disabled while its list is open (its form started saving) closes
  // the list, as a native select does, so nothing can still be picked.
  useEffect(() => {
    if (disabled) {
      setOpen(false);
      setActiveIndex(-1);
    }
  }, [disabled]);

  const openAt = (index: number) => {
    setOpen(true);
    setActiveIndex(Math.max(0, Math.min(index, options.length - 1)));
  };

  const choose = (next: string) => {
    if (next !== value) onChange(next);
    close();
    boxRef.current?.focus();
  };

  // The active option stays in view as the keys move through a long list.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const el = document.getElementById(optionId(baseId, activeIndex));
    if (el) scrollToElement(el, { block: "nearest" });
  }, [open, activeIndex, baseId]);

  const matchLetter = (letter: string) => {
    const from = open ? activeIndex : selectedIndex;
    const lower = letter.toLowerCase();
    for (let step = 1; step <= options.length; step++) {
      const index = (from + step + options.length) % options.length;
      const o = options[index].props;
      const text = (o.textValue ?? textOf(o.children)).trim().toLowerCase();
      if (text.startsWith(lower)) return index;
    }
    return -1;
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || options.length === 0) return;
    const start = selectedIndex < 0 ? 0 : selectedIndex;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open || event.altKey) openAt(start);
        else setActiveIndex(Math.min(activeIndex + 1, options.length - 1));
        return;
      case "ArrowUp":
        event.preventDefault();
        if (!open) openAt(start);
        else setActiveIndex(Math.max(activeIndex - 1, 0));
        return;
      case "Home":
        event.preventDefault();
        openAt(0);
        return;
      case "End":
        event.preventDefault();
        openAt(options.length - 1);
        return;
      case "Enter":
      case " ":
        // Never submits the surrounding form, and never lets the button's own
        // click toggle the list straight back.
        event.preventDefault();
        if (!open) openAt(start);
        else if (options[activeIndex]) choose(options[activeIndex].props.value);
        return;
      case "Escape":
        if (open) {
          // Handled, so a dialog the box sits in stays open.
          event.preventDefault();
          close();
        }
        return;
      case "Tab":
        if (open) close();
        return;
    }

    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
      const index = matchLetter(event.key);
      if (index >= 0) {
        event.preventDefault();
        openAt(index);
      }
    }
  };

  return (
    <SelectContext.Provider
      value={{
        baseId,
        activeIndex: open ? activeIndex : -1,
        selectedValue: value,
        setActive: setActiveIndex,
        choose,
      }}
    >
      <button
        {...rest}
        ref={(el) => {
          boxRef.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        }}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={
          open && activeIndex >= 0 ? optionId(baseId, activeIndex) : undefined
        }
        disabled={disabled}
        className={cx(styles.trigger, className)}
        onMouseDownCapture={pressInside.onMouseDownCapture}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented) return;
          if (open) close();
          else openAt(selectedIndex < 0 ? 0 : selectedIndex);
        }}
        onKeyDown={handleKeyDown}
      >
        <span className={styles.value}>{selected?.props.children}</span>
        <ChevronDown size={16} aria-hidden className={styles.chevron} />
      </button>
      <AnchoredList
        anchor={boxRef}
        open={open}
        id={listId}
        role="listbox"
        aria-labelledby={rest["aria-labelledby"]}
        aria-label={rest["aria-label"]}
        className={styles.list}
        onMouseDownCapture={pressInside.onMouseDownCapture}
      >
        {options.map((option, index) => (
          <IndexContext.Provider key={option.key ?? index} value={index}>
            {option}
          </IndexContext.Provider>
        ))}
      </AnchoredList>
    </SelectContext.Provider>
  );
});

const Option = forwardRef<HTMLDivElement, SelectOptionProps>(function Option(
  {
    value,
    textValue: _textValue,
    children,
    className,
    onMouseDown,
    onMouseMove,
    onClick,
    ...rest
  },
  ref,
) {
  const context = useContext(SelectContext);
  const index = useContext(IndexContext);
  if (!context) return null;
  const { baseId, activeIndex, selectedValue, setActive, choose } = context;

  return (
    <div
      {...rest}
      ref={ref}
      id={optionId(baseId, index)}
      role="option"
      // What it picks, for tests and tools that choose by value, as they
      // would on a native <option>.
      data-value={value}
      aria-selected={value === selectedValue}
      data-active={index === activeIndex ? "" : undefined}
      className={cx(styles.option, className)}
      // On mousedown so the box keeps focus; picked on click, so a press can
      // still be abandoned by moving off before letting go.
      onMouseDown={(event) => {
        onMouseDown?.(event);
        event.preventDefault();
      }}
      onMouseMove={(event) => {
        onMouseMove?.(event);
        if (index !== activeIndex) setActive(index);
      }}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) choose(value);
      }}
    >
      <Check size={16} aria-hidden className={styles.check} />
      {children}
    </div>
  );
});

export { Root as SelectRoot, Option as SelectOption };
