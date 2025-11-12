import React from 'react';
import styled from 'styled-components';
import { CharacterCard, CharacterCardItem } from './CharacterCard';

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

interface CharacterGridProps {
  characters: CharacterCardItem[];
  showOwner?: boolean;
  showEditButton?: boolean;
}

export const CharacterGrid: React.FC<CharacterGridProps> = ({ 
  characters, 
  showOwner = true,
  showEditButton = false
}) => {
  return (
    <Grid>
      {characters.map((character) => (
        <CharacterCard
          key={character.id}
          character={character}
          showOwner={showOwner}
          showEditButton={showEditButton}
        />
      ))}
    </Grid>
  );
};