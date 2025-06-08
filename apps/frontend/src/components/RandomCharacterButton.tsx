import React from "react";
import styled from "styled-components";
import { Tooltip } from "./Tooltip";
import { useRandomCharacter } from "../hooks/useRandomCharacter";

interface Character {
  id: string;
}

interface RandomCharacterButtonProps {
  characters: Character[];
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

const getSizeStyles = (size: string) => {
  switch (size) {
    case "sm":
      return "1.2rem";
    case "lg":
      return "2rem";
    case "md":
    default:
      return "1.5rem";
  }
};

const TooltipContainer = styled.div`
  display: inline-block;
`;

const IconButton = styled.button<{ size: string }>`
  background: none;
  border: none;
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing.xs};
  border-radius: 50%;
  font-size: ${({ size }) => getSizeStyles(size)};
  color: ${({ theme }) => theme.colors.text.secondary};
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2em;
  height: 2em;

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.surface};
    transform: rotate(180deg) scale(1.1) translateY(-2px);
  }

  &:active:not(:disabled) {
    transform: rotate(180deg) scale(0.95) translateY(-2px);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

export const RandomCharacterButton: React.FC<RandomCharacterButtonProps> = ({
  characters,
  disabled = false,
  size = "md",
}) => {
  const { goToRandomCharacter } = useRandomCharacter();

  const handleClick = () => {
    goToRandomCharacter(characters);
  };

  const isDisabled = disabled || characters.length === 0;
  const tooltipText = isDisabled
    ? "No characters available"
    : `Random character (${characters.length} available)`;

  return (
    <>
      <TooltipContainer
        data-tooltip-id="random-character-tooltip"
        data-tooltip-content={tooltipText}
      >
        <IconButton
          size={size}
          onClick={handleClick}
          disabled={isDisabled}
          aria-label={tooltipText}
        >
          🎲
        </IconButton>
      </TooltipContainer>
      <Tooltip id="random-character-tooltip" />
    </>
  );
};
