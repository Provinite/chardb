import React, { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import styled from "styled-components";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { timingMs } from "../theme/tokens";
import { AnchoredList } from "./AnchoredList";
import { Avatar } from "./Avatar";
import { usePressOutside } from "./floating";

export interface SelectedUser {
  id: string;
  username: string;
  displayName?: string | null;
  avatarImage?: {
    id: string;
    originalUrl: string;
    thumbnailUrl: string | null;
    altText: string | null;
  } | null;
}

export interface UserTypeaheadProps {
  value: string | null; // selected user ID
  onChange: (userId: string | null, user: SelectedUser | null) => void;
  onSearch: (query: string) => void;
  users?: SelectedUser[];
  loading?: boolean;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
}

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
  position: relative;
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
  cursor: ${({ $disabled }) => ($disabled ? "not-allowed" : "text")};
  transition: border-color 0.2s;

  &:focus-within {
    border-color: ${({ theme, $hasError }) =>
      $hasError ? theme.colors.error : theme.colors.primary};
  }

  &:hover:not(:focus-within) {
    border-color: ${({ theme, $hasError, $disabled }) =>
      $disabled
        ? theme.colors.border
        : $hasError
          ? theme.colors.error
          : theme.colors.text.muted};
  }
`;

const SelectedUserInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const Username = styled.div`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const DisplayName = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.muted};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Input = styled.input.attrs<{
  "data-lpignore"?: string;
  "data-form-type"?: string;
  autoComplete?: string;
}>((props) => ({
  "data-lpignore": props["data-lpignore"],
  "data-form-type": props["data-form-type"],
  autoComplete: props.autoComplete,
}))`
  flex: 1;
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

const ClearButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
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

const Dropdown = styled(AnchoredList)`
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  box-shadow: ${({ theme }) => theme.shadows.md};
`;

const UserItem = styled.button<{ $isHighlighted: boolean }>`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border: none;
  background: ${({ theme, $isHighlighted }) =>
    $isHighlighted ? theme.colors.surface : "transparent"};
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-align: left;

  &:hover {
    background: ${({ theme }) => theme.colors.surface};
  }

  &:focus {
    outline: none;
    background: ${({ theme }) => theme.colors.surface};
  }
`;

const UserItemInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const LoadingIndicator = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  text-align: center;
`;

const EmptyState = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  text-align: center;
`;

const ErrorMessage = styled.div`
  color: ${({ theme }) => theme.colors.error};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

export const UserTypeahead: React.FC<UserTypeaheadProps> = ({
  value,
  onChange,
  onSearch,
  users = [],
  loading = false,
  placeholder = "Search...",
  disabled = false,
  error,
  label,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // Searched once typing pauses. Through a ref, so a caller passing a new
  // function each render does not search again.
  const settled = useDebouncedValue(
    inputValue.trim(),
    timingMs.debounce.typeahead,
  );
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;
  useEffect(() => {
    if (settled.length >= 2) onSearchRef.current(settled);
  }, [settled]);

  const pressInside = usePressOutside(isOpen, () => {
    setIsOpen(false);
    setHighlightedIndex(-1);
  });

  // Sync value prop with internal selectedUser state
  useEffect(() => {
    if (value && users && users.length > 0) {
      const user = users.find((u) => u.id === value);
      if (user) {
        setSelectedUser(user);
      }
    } else if (!value) {
      setSelectedUser(null);
    }
  }, [value, users]);

  const shouldShowDropdown =
    isOpen &&
    !selectedUser &&
    (loading || users.length > 0 || inputValue.length >= 2);

  const selectUser = (user: SelectedUser) => {
    setSelectedUser(user);
    onChange(user.id, user);
    setInputValue("");
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const clearSelection = () => {
    setSelectedUser(null);
    onChange(null, null);
    setInputValue("");
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && users[highlightedIndex]) {
          selectUser(users[highlightedIndex]);
        }
        break;

      case "Escape":
        // Handled, so a dialog the box sits in stays open.
        if (shouldShowDropdown) e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;

      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < users.length - 1 ? prev + 1 : prev,
        );
        break;

      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > -1 ? prev - 1 : -1));
        break;
    }
  };

  const handleInputClick = () => {
    if (!selectedUser) {
      setIsOpen(true);
    }
  };

  const renderAvatar = (user: SelectedUser) => (
    <Avatar
      image={user.avatarImage}
      name={user.displayName || user.username}
      size={32}
    />
  );

  return (
    <Container onMouseDownCapture={pressInside.onMouseDownCapture}>
      {label && <Label>{label}</Label>}

      <InputWrapper ref={boxRef} $hasError={!!error} $disabled={disabled}>
        {selectedUser ? (
          <>
            {renderAvatar(selectedUser)}
            <SelectedUserInfo>
              <Username>{selectedUser.username}</Username>
              {selectedUser.displayName && (
                <DisplayName>{selectedUser.displayName}</DisplayName>
              )}
            </SelectedUserInfo>
            {!disabled && (
              <ClearButton
                type="button"
                onClick={clearSelection}
                aria-label="Clear selection"
              >
                <X size={14} aria-hidden />
              </ClearButton>
            )}
          </>
        ) : (
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            onClick={handleInputClick}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            aria-label="Search for user"
            autoComplete="off"
            data-lpignore="true"
            data-form-type="other"
          />
        )}
      </InputWrapper>

      <Dropdown anchor={boxRef} open={shouldShowDropdown}>
        {loading ? (
          <LoadingIndicator>Searching...</LoadingIndicator>
        ) : inputValue.length < 2 ? (
          <EmptyState>Type at least 2 characters to search</EmptyState>
        ) : users.length === 0 ? (
          <EmptyState>No users found</EmptyState>
        ) : (
          users.map((user, index) => (
            <UserItem
              key={user.id}
              type="button"
              // Picked with the arrow keys and Enter from the input; Tab
              // moves on past the list, which sits at the end of the page.
              tabIndex={-1}
              $isHighlighted={index === highlightedIndex}
              onClick={() => selectUser(user)}
            >
              {renderAvatar(user)}
              <UserItemInfo>
                <Username>{user.username}</Username>
                {user.displayName && (
                  <DisplayName>{user.displayName}</DisplayName>
                )}
              </UserItemInfo>
            </UserItem>
          ))
        )}
      </Dropdown>

      {error && <ErrorMessage>{error}</ErrorMessage>}
    </Container>
  );
};
