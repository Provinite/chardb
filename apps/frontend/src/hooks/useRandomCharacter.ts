import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface Character {
  id: string;
}

export const useRandomCharacter = () => {
  const navigate = useNavigate();

  const goToRandomCharacter = useCallback(
    (characters: Character[]) => {
      if (characters.length === 0) {
        return;
      }

      const randomIndex = Math.floor(Math.random() * characters.length);
      const randomCharacter = characters[randomIndex];
      navigate(`/character/${randomCharacter.id}`);
    },
    [navigate],
  );

  return { goToRandomCharacter };
};
