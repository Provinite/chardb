import React, { useEffect, useId, useRef, useState } from "react";
import styled from "styled-components";

/**
 * SearchSelect - a search box that picks one thing from a list of matches.
 *
 * It fetches nothing. The caller runs whatever query fits, passes the
 * matches in as `options`, and holds the selection, so the same box serves
 * any API. `CharacterTypeahead` and `ItemTypeTypeahead` are this with their
 * own wording.
 *
 * @example
 * ```tsx
 * const [search, setSearch] = useState("");
 * const { data, loading } = useSomeSearchQuery({ variables: { search } });
 *
 * <CharacterTypeahead
 *   label="Character"
 *   value={picked}
 *   onChange={setPicked}
 *   onSearch={setSearch}
 *   options={data?.results ?? []}
 *   loading={loading}
 * />
 * ```
 */

export interface SearchSelectOption {
  id: string;
  name: string;
  /** Thumbnail URL; the option shows its initial without one. */
  image?: string | null;
  /** A second, muted line, such as a character's species. */
  subtitle?: string | null;
}

export interface SearchSelectProps<T extends SearchSelectOption> {
  value: T | null;
  onChange: (option: T | null) => void;
  /** Called with the typed text once typing pauses. */
  onSearch: (search: string) => void;
  options: T[];
  loading?: boolean;
  error?: string;
  label: string;
  placeholder?: string;
  disabled?: boolean;
  /**
   * How much has to be typed before anything is listed. 0 lists `options`
   * as soon as the box opens, for short lists worth browsing.
   */
  minSearchLength?: number;
  /** Shown when a search matched nothing. */
  emptyText?: string;
}

const SEARCH_DELAY_MS = 300;

const Container = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const InputWrapper = styled.div<{ $hasError?: boolean; $disabled?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 2px solid
    ${({ theme, $hasError }) =>
      $hasError ? theme.colors.error : theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ theme, $disabled }) =>
    $disabled ? theme.colors.surface : theme.colors.background};
  transition: border-color 0.2s;

  &:focus-within {
    border-color: ${({ theme, $hasError }) =>
      $hasError ? theme.colors.error : theme.colors.primary};
  }
`;

const Input = styled.input`
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  outline: none;
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  color: ${({ theme }) => theme.colors.text.primary};

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.muted};
  }

  &:disabled {
    color: ${({ theme }) => theme.colors.text.muted};
    cursor: not-allowed;
  }
`;

const Thumb = styled.img`
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  object-fit: cover;
  flex-shrink: 0;
`;

const Initial = styled.span`
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 600;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Info = styled.div`
  flex: 1;
  min-width: 0;
`;

const Name = styled.div`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Subtitle = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.muted};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ClearButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover {
    background: ${({ theme }) => theme.colors.error};
    color: white;
    border-color: ${({ theme }) => theme.colors.error};
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const Dropdown = styled.ul`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  box-shadow: ${({ theme }) => theme.shadows.md};
  z-index: 1000;
  max-height: 300px;
  overflow-y: auto;
`;

const Item = styled.li<{ $highlighted: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  cursor: pointer;
  background: ${({ theme, $highlighted }) =>
    $highlighted ? theme.colors.surface : "transparent"};
  transition: background 0.2s;

  &:hover {
    background: ${({ theme }) => theme.colors.surface};
  }
`;

const Note = styled.li`
  padding: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  text-align: center;
`;

const ErrorMessage = styled.div`
  color: ${({ theme }) => theme.colors.error};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

const OptionPicture: React.FC<{ option: SearchSelectOption }> = ({ option }) =>
  option.image ? (
    <Thumb src={option.image} alt="" />
  ) : (
    <Initial aria-hidden="true">{option.name.charAt(0).toUpperCase()}</Initial>
  );

export function SearchSelect<T extends SearchSelectOption>({
  value,
  onChange,
  onSearch,
  options,
  loading = false,
  error,
  label,
  placeholder = "Search...",
  disabled = false,
  minSearchLength = 2,
  emptyText = "Nothing found",
}: SearchSelectProps<T>) {
  const id = useId();
  const listId = `${id}-list`;
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typed = useRef(false);

  const query = text.trim();
  const searchable = query.length >= minSearchLength;
  const listed = searchable ? options : [];

  // The timer lives in the closure, so the cleanup always clears the run it
  // belongs to -- including on unmount.
  useEffect(() => {
    if (!typed.current || !searchable) return;
    const timeout = setTimeout(() => onSearch(query), SEARCH_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [query, searchable, onSearch]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setHighlighted(-1);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const choose = (option: T) => {
    onChange(option);
    setText("");
    setOpen(false);
    setHighlighted(-1);
  };

  const clear = () => {
    onChange(null);
    // The input only mounts once the selection is gone.
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setOpen(true);
        setHighlighted((i) => Math.min(i + 1, listed.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setHighlighted((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        // Never submits the surrounding form.
        event.preventDefault();
        if (open && listed[highlighted]) choose(listed[highlighted]);
        break;
      case "Escape":
        setOpen(false);
        setHighlighted(-1);
        break;
    }
  };

  const note = !searchable
    ? `Type at least ${minSearchLength} characters to search`
    : loading && listed.length === 0
      ? "Searching..."
      : listed.length === 0
        ? emptyText
        : null;

  return (
    <Container ref={containerRef}>
      <Label htmlFor={id}>{label}</Label>

      <InputWrapper $hasError={!!error} $disabled={disabled}>
        {value ? (
          <>
            <OptionPicture option={value} />
            <Info>
              <Name>{value.name}</Name>
              {value.subtitle && <Subtitle>{value.subtitle}</Subtitle>}
            </Info>
            {!disabled && (
              <ClearButton
                type="button"
                onClick={clear}
                aria-label={`Clear ${label.toLowerCase()}`}
              >
                ×
              </ClearButton>
            )}
          </>
        ) : (
          <Input
            id={id}
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              open && listed[highlighted] ? `${id}-${highlighted}` : undefined
            }
            value={text}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete="off"
            data-lpignore="true"
            data-form-type="other"
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onChange={(e) => {
              typed.current = true;
              setText(e.target.value);
              setOpen(true);
              setHighlighted(-1);
            }}
            onKeyDown={handleKeyDown}
          />
        )}
      </InputWrapper>

      {open && !value && (
        <Dropdown id={listId} role="listbox" aria-label={label}>
          {note ? (
            <Note>{note}</Note>
          ) : (
            listed.map((option, index) => (
              <Item
                key={option.id}
                id={`${id}-${index}`}
                role="option"
                aria-selected={index === highlighted}
                $highlighted={index === highlighted}
                // Picked on mousedown, before the input's blur can close
                // the list.
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(option);
                }}
                onMouseEnter={() => setHighlighted(index)}
              >
                <OptionPicture option={option} />
                <Info>
                  <Name>{option.name}</Name>
                  {option.subtitle && <Subtitle>{option.subtitle}</Subtitle>}
                </Info>
              </Item>
            ))
          )}
        </Dropdown>
      )}

      {error && <ErrorMessage>{error}</ErrorMessage>}
    </Container>
  );
}

type WrapperProps<T extends SearchSelectOption> = Omit<
  SearchSelectProps<T>,
  "label"
> & { label?: string };

/** Picks a character. The caller decides which characters are on offer. */
export function CharacterTypeahead<T extends SearchSelectOption>({
  label = "Character",
  placeholder = "Search characters...",
  emptyText = "No characters found",
  ...props
}: WrapperProps<T>) {
  return (
    <SearchSelect
      label={label}
      placeholder={placeholder}
      emptyText={emptyText}
      {...props}
    />
  );
}

/** Picks an item type. The caller decides which item types are on offer. */
export function ItemTypeTypeahead<T extends SearchSelectOption>({
  label = "Item type",
  placeholder = "Search item types...",
  emptyText = "No item types found",
  ...props
}: WrapperProps<T>) {
  return (
    <SearchSelect
      label={label}
      placeholder={placeholder}
      emptyText={emptyText}
      {...props}
    />
  );
}
