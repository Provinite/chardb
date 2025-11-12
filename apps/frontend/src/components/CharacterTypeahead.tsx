import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import { useGetMyEditableCharactersQuery } from "../generated/graphql";

interface Character {
  id: string;
  name: string;
  species?: {
    id: string;
    name: string;
  } | null;
}

interface CharacterTypeaheadProps {
  value: string | null;
  onChange: (characterId: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

const Container = styled.div`
  position: relative;
  width: 100%;
`;

const Input = styled.input`
  padding: ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  width: 100%;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &:disabled {
    background: ${({ theme }) => theme.colors.surface};
    cursor: not-allowed;
  }
`;

const Dropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: ${({ theme }) => theme.spacing.xs};
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const Option = styled.div<{ selected?: boolean }>`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  cursor: pointer;
  background: ${({ theme, selected }) =>
    selected ? `${theme.colors.primary}15` : "transparent"};
  transition: background 0.2s ease;

  &:hover {
    background: ${({ theme }) => `${theme.colors.primary}20`};
  }
`;

const CharacterName = styled.div`
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const SpeciesName = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-top: 2px;
`;

const NoResults = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  text-align: center;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

const LoadingMessage = styled(NoResults)``;

const ClearButton = styled.button`
  position: absolute;
  right: ${({ theme }) => theme.spacing.sm};
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing.xs};
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.borderRadius.sm};

  &:hover {
    background: ${({ theme }) => `${theme.colors.primary}15`};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

export const CharacterTypeahead: React.FC<CharacterTypeaheadProps> = ({
  value,
  onChange,
  placeholder = "Search characters...",
  disabled = false,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(
    null
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, loading } = useGetMyEditableCharactersQuery({
    variables: {
      filters: {
        limit: 50,
        search: searchQuery || undefined,
      },
    },
    skip: !isOpen && !searchQuery,
  });

  const characters = data?.myEditableCharacters?.characters || [];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load selected character details when value changes
  useEffect(() => {
    if (value && characters.length > 0) {
      const character = characters.find((c) => c.id === value);
      if (character) {
        setSelectedCharacter(character);
        setSearchQuery(character.name);
      }
    } else if (!value) {
      setSelectedCharacter(null);
      setSearchQuery("");
    }
  }, [value, characters]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setIsOpen(true);

    // Clear selection if user is typing
    if (selectedCharacter) {
      setSelectedCharacter(null);
      onChange(null);
    }
  };

  const handleSelect = (character: Character) => {
    setSelectedCharacter(character);
    setSearchQuery(character.name);
    onChange(character.id);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelectedCharacter(null);
    setSearchQuery("");
    onChange(null);
    setIsOpen(false);
  };

  const handleFocus = () => {
    setIsOpen(true);
  };

  return (
    <Container ref={containerRef}>
      <Input
        type="text"
        value={searchQuery}
        onChange={handleInputChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        disabled={disabled}
      />
      {selectedCharacter && !disabled && (
        <ClearButton onClick={handleClear} type="button">
          ✕
        </ClearButton>
      )}
      {isOpen && !disabled && (
        <Dropdown>
          {loading ? (
            <LoadingMessage>Loading characters...</LoadingMessage>
          ) : characters.length === 0 ? (
            <NoResults>
              {searchQuery
                ? "No characters found"
                : "Start typing to search characters"}
            </NoResults>
          ) : (
            characters.map((character) => (
              <Option
                key={character.id}
                selected={character.id === value}
                onClick={() => handleSelect(character)}
              >
                <CharacterName>{character.name}</CharacterName>
                {character.species && (
                  <SpeciesName>{character.species.name}</SpeciesName>
                )}
              </Option>
            ))
          )}
        </Dropdown>
      )}
    </Container>
  );
};
