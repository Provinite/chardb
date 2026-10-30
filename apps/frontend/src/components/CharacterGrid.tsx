import React from "react";
import { Grid } from "@chardb/ui";
import { CharacterCard, CharacterCardItem } from "./CharacterCard";
import * as styles from "./CharacterGrid.css";

interface CharacterGridProps {
  characters: CharacterCardItem[];
  showOwner?: boolean;
}

export const CharacterGrid: React.FC<CharacterGridProps> = ({
  characters,
  showOwner = true,
}) => {
  return (
    // `fill` keeps a short last row at one card width instead of stretching it.
    <Grid min="card" repeat="fill" gap="lg" className={styles.grid}>
      {characters.map((character) => (
        <CharacterCard
          key={character.id}
          character={character}
          showOwner={showOwner}
        />
      ))}
    </Grid>
  );
};
