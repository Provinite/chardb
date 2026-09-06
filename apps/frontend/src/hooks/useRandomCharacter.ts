import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

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
      // Stays a router navigation, and stays relative, because
      // `/character/:id` is a route on both hosts: on a community host it is
      // that community's character, and at the apex it is `CharacterHostGuard`,
      // which forwards to whichever host owns it. Naming the host outright
      // would need the species' community slug, which none of the list queries
      // feeding this select.
      navigate(`/character/${randomCharacter.id}`);
    },
    [navigate],
  );

  return { goToRandomCharacter };
};
