import React, { useState, useRef, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Theme } from '../theme';

export interface Tag {
  id: string;
  name: string;
  category?: string;
  color?: string;
}

export interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  onSearch?: (query: string) => Promise<Tag[]>;
  suggestions?: Tag[];
  loading?: boolean;
  disabled?: boolean;
  error?: string;
  maxTags?: number;
}

const Container = styled.div<{ hasError?: boolean }>`
  position: relative;
  min-height: 42px;
  border: 2px solid ${({ theme, hasError }) => hasError ? theme.colors.error : theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ theme }) => theme.colors.background};
  padding: ${({ theme }) => theme.spacing.xs};
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xs};
  align-items: flex-start;
  cursor: text;
  transition: border-color 0.2s;

  &:focus-within {
    border-color: ${({ theme, hasError }) => hasError ? theme.colors.error : theme.colors.primary};
  }

  &:hover:not(:focus-within) {
    border-color: ${({ theme, hasError }) => hasError ? theme.colors.error : theme.colors.text.muted};
  }
`;

const TagChip = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  max-width: 200px;
  
  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const RemoveButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  transition: background 0.2s;
  flex-shrink: 0;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  &:focus {
    outline: 2px solid rgba(255, 255, 255, 0.5);
    outline-offset: 1px;
  }
`;

const Input = styled.input`
  border: none;
  background: transparent;
  outline: none;
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  color: ${({ theme }) => theme.colors.text.primary};
  min-width: 120px;
  flex: 1;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.xs};

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.muted};
  }

  &:disabled {
    color: ${({ theme }) => theme.colors.text.muted};
    cursor: not-allowed;
  }
`;

const SuggestionsDropdown = styled.div<{ isOpen: boolean }>`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  box-shadow: ${({ theme }) => theme.shadows.md};
  z-index: 1000;
  max-height: 200px;
  overflow-y: auto;
  display: ${({ isOpen }) => isOpen ? 'block' : 'none'};
  margin-top: 2px;
`;

const SuggestionItem = styled.button<{ isHighlighted: boolean }>`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border: none;
  background: ${({ theme, isHighlighted }) => 
    isHighlighted ? theme.colors.surface : 'transparent'};
  color: ${({ theme }) => theme.colors.text.primary};
  text-align: left;
  cursor: pointer;
  transition: background 0.2s;
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  
  &:hover {
    background: ${({ theme }) => theme.colors.surface};
  }

  &:focus {
    outline: none;
    background: ${({ theme }) => theme.colors.surface};
  }
`;

const LoadingIndicator = styled.div`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  text-align: center;
`;

const ErrorMessage = styled.div`
  color: ${({ theme }) => theme.colors.error};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

export const TagInput: React.FC<TagInputProps> = ({
  value = [],
  onChange,
  placeholder = "Add tags...",
  onSearch,
  suggestions = [],
  loading = false,
  disabled = false,
  error,
  maxTags,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter suggestions to exclude already selected tags
  const availableSuggestions = suggestions.filter(
    suggestion => !value.includes(suggestion.name.toLowerCase())
  );

  // Debounced search
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const performSearch = useCallback((query: string) => {
    if (onSearch) {
      onSearch(query);
    }
  }, [onSearch]);

  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (inputValue.trim()) {
      const timeout = setTimeout(() => {
        performSearch(inputValue.trim());
      }, 300); // 300ms debounce
      setSearchTimeout(timeout);
    }

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [inputValue, performSearch]);

  // Handle clicks outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addTag = (tagName: string) => {
    const normalizedTag = tagName.trim().toLowerCase();
    if (normalizedTag && !value.includes(normalizedTag)) {
      if (!maxTags || value.length < maxTags) {
        onChange([...value, normalizedTag]);
        setInputValue('');
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }
  };

  const removeTag = (index: number) => {
    const newTags = value.filter((_, i) => i !== index);
    onChange(newTags);
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
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && availableSuggestions[highlightedIndex]) {
          addTag(availableSuggestions[highlightedIndex].name);
        } else if (inputValue.trim()) {
          addTag(inputValue.trim());
        }
        break;
      
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
      
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < availableSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > -1 ? prev - 1 : -1);
        break;
      
      case 'Backspace':
        if (!inputValue && value.length > 0) {
          removeTag(value.length - 1);
        }
        break;
      
      case ',':
      case 'Tab':
        if (inputValue.trim()) {
          e.preventDefault();
          addTag(inputValue.trim());
        }
        break;
    }
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
    setIsOpen(true);
  };

  const handleSuggestionClick = (suggestion: Tag) => {
    addTag(suggestion.name);
  };

  return (
    <div ref={containerRef}>
      <Container 
        hasError={!!error} 
        onClick={handleContainerClick}
      >
        {value.map((tag, index) => (
          <TagChip key={`${tag}-${index}`}>
            <span title={tag}>{tag}</span>
            <RemoveButton
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(index);
              }}
              disabled={disabled}
              aria-label={`Remove tag ${tag}`}
            >
              ×
            </RemoveButton>
          </TagChip>
        ))}
        
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={value.length === 0 ? placeholder : ''}
          disabled={disabled}
          aria-label="Add tags"
        />
        
        <SuggestionsDropdown isOpen={isOpen && (loading || availableSuggestions.length > 0)}>
          {loading ? (
            <LoadingIndicator>Searching...</LoadingIndicator>
          ) : (
            availableSuggestions.map((suggestion, index) => (
              <SuggestionItem
                key={suggestion.id}
                type="button"
                isHighlighted={index === highlightedIndex}
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion.name}
              </SuggestionItem>
            ))
          )}
        </SuggestionsDropdown>
      </Container>
      
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </div>
  );
};