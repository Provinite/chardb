import React, { useEffect, useId, useRef, useState } from "react";
import styled from "styled-components";
import { X } from "lucide-react";

/**
 * Picks the item type or character a Halloween prize hands out. A community
 * can have hundreds of item types, so it is a search box with a list of
 * matches rather than a grid of everything.
 */

export interface PrizePickerOption {
  id: string;
  name: string;
  image?: string | null;
}

interface HalloweenPrizePickerProps {
  label: string;
  options: PrizePickerOption[];
  loading: boolean;
  selected: PrizePickerOption | null;
  /** Called with the trimmed search text once typing pauses; null for everything. */
  onSearch: (search: string | null) => void;
  onSelect: (option: PrizePickerOption | null) => void;
}

const SEARCH_DELAY_MS = 300;

const Container = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Box = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ theme }) => theme.colors.background};

  &:focus-within {
    border-color: ${({ theme }) => theme.colors.primary};
  }

  input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    font-size: 1rem;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const Thumb = styled.img`
  width: 32px;
  height: 32px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
`;

const ThumbBlank = styled.span`
  width: 32px;
  height: 32px;
  border-radius: 4px;
  flex-shrink: 0;
  background: ${({ theme }) => theme.colors.surface};
`;

const Clear = styled.button`
  display: flex;
  padding: 0.25rem;
  border: none;
  background: transparent;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const List = styled.ul`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 10;
  margin: 0.25rem 0 0;
  padding: 0.25rem 0;
  list-style: none;
  max-height: 240px;
  overflow-y: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ theme }) => theme.colors.background};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
`;

const Item = styled.li<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.75rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme, $active }) =>
    $active ? `${theme.colors.primary}20` : "transparent"};
`;

const Note = styled.li`
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const OptionThumb: React.FC<{ image?: string | null }> = ({ image }) =>
  image ? <Thumb src={image} alt="" /> : <ThumbBlank />;

export const HalloweenPrizePicker: React.FC<HalloweenPrizePickerProps> = ({
  label,
  options,
  loading,
  selected,
  onSearch,
  onSelect,
}) => {
  const id = useId();
  const listId = `${id}-list`;
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typed = useRef(false);

  useEffect(() => {
    // Only searches once someone has typed: opening the list shows the
    // first page the parent already loaded.
    if (!typed.current) return;
    const timeout = setTimeout(
      () => onSearch(text.trim() || null),
      SEARCH_DELAY_MS,
    );
    return () => clearTimeout(timeout);
  }, [text, onSearch]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const choose = (option: PrizePickerOption) => {
    onSelect(option);
    setText("");
    setOpen(false);
    setActive(-1);
  };

  const clear = () => {
    onSelect(null);
    setOpen(true);
    // The input mounts again once the selection is gone.
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setOpen(true);
        setActive((i) => Math.min(i + 1, options.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        // Never submits the form from here.
        event.preventDefault();
        if (open && options[active]) choose(options[active]);
        break;
      case "Escape":
        setOpen(false);
        break;
    }
  };

  return (
    <Container ref={containerRef}>
      <Label htmlFor={id}>{label}</Label>
      <Box>
        {selected ? (
          <>
            <OptionThumb image={selected.image} />
            <input id={id} value={selected.name} readOnly aria-label={label} />
            <Clear
              type="button"
              aria-label={`Clear ${label.toLowerCase()}`}
              onClick={clear}
            >
              <X size={16} />
            </Clear>
          </>
        ) : (
          <input
            id={id}
            ref={inputRef}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              open && options[active] ? `${id}-${active}` : undefined
            }
            autoComplete="off"
            placeholder="Start typing to search…"
            value={text}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onChange={(e) => {
              typed.current = true;
              setText(e.target.value);
              setOpen(true);
              setActive(-1);
            }}
            onKeyDown={handleKeyDown}
          />
        )}
      </Box>
      {open && !selected && (
        <List id={listId} role="listbox" aria-label={label}>
          {loading && options.length === 0 ? (
            <Note>Searching…</Note>
          ) : options.length === 0 ? (
            <Note>Nothing found.</Note>
          ) : (
            options.map((option, index) => (
              <Item
                key={option.id}
                id={`${id}-${index}`}
                role="option"
                aria-selected={index === active}
                $active={index === active}
                // Chosen on mousedown so the input's blur cannot close the
                // list first.
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(option);
                }}
                onMouseEnter={() => setActive(index)}
              >
                <OptionThumb image={option.image} />
                {option.name}
              </Item>
            ))
          )}
        </List>
      )}
    </Container>
  );
};
