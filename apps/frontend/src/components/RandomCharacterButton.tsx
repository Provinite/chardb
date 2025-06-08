import React from 'react';
import styled from 'styled-components';
import { Button } from '@thclone/ui';
import { useRandomCharacter } from '../hooks/useRandomCharacter';

interface Character {
  id: string;
}

interface RandomCharacterButtonProps {
  characters: Character[];
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
}

const ButtonWrapper = styled.div<{ title: string }>`
  position: relative;
  display: inline-block;
`;

const StyledButton = styled(Button)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  
  &:hover {
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const Icon = styled.span`
  font-size: 1.1em;
  transition: transform 0.2s ease;
  
  ${StyledButton}:hover & {
    transform: rotate(180deg);
  }
`;

export const RandomCharacterButton: React.FC<RandomCharacterButtonProps> = ({
  characters,
  disabled = false,
  size = 'md',
  variant = 'outline',
}) => {
  const { goToRandomCharacter } = useRandomCharacter();

  const handleClick = () => {
    goToRandomCharacter(characters);
  };

  const isDisabled = disabled || characters.length === 0;
  const tooltipText = isDisabled ? 'No characters available' : `Go to random character (${characters.length} available)`;

  return (
    <ButtonWrapper title={tooltipText}>
      <StyledButton
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={isDisabled}
      >
        <Icon>🎲</Icon>
        Random Character
      </StyledButton>
    </ButtonWrapper>
  );
};