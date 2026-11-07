import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApolloClient } from "@apollo/client";
import toast from "react-hot-toast";
import {
  CharacterFiltersInput,
  GetRandomCharacterPickDocument,
  GetRandomCharacterPickQuery,
  GetRandomCharacterPickQueryVariables,
} from "../generated/graphql";
import { pickRandomCharacterId } from "../lib/pickRandomCharacter";

// Stays a router navigation, and stays relative, because `/character/:id` is
// a route on both hosts: on a community host it is that community's
// character, and at the apex it is `CharacterHostGuard`, which forwards to
// whichever host owns it. Naming the host outright would make it a
// cross-origin URL, which the router cannot navigate to.
const characterPath = (id: string) => `/character/${id}`;

/**
 * A random pick from every character a filtered listing matches, of which the
 * page on screen is only the first few.
 *
 * `total` is the listing's own count; the pick asks the server for the one
 * character at a random offset under the same filters.
 *
 * A button that navigates, against the links-go-somewhere rule, because the
 * destination is not known until the server has picked it.
 */
export const useRandomFilteredCharacter = (
  filters: CharacterFiltersInput,
  total: number,
) => {
  const navigate = useNavigate();
  const client = useApolloClient();
  const [picking, setPicking] = useState(false);

  // Bumped when the filters change or the listing goes away, so a pick that
  // lands afterwards does not pull someone off what they moved on to. Keyed
  // on the values, not the object, so a caller rebuilding equal filters each
  // render does not make every pick stale. The pick that went stale no longer
  // owns `picking`, so it is released here rather than when it lands.
  const filtersKey = JSON.stringify(filters);
  const generation = useRef(0);
  useEffect(() => {
    const current = generation;
    current.current += 1;
    setPicking(false);
    return () => {
      current.current += 1;
    };
  }, [filtersKey]);

  const goToRandomCharacter = useCallback(async () => {
    const started = generation.current;
    const stale = () => generation.current !== started;
    setPicking(true);
    try {
      const id = await pickRandomCharacterId(async (offset) => {
        const { data } = await client.query<
          GetRandomCharacterPickQuery,
          GetRandomCharacterPickQueryVariables
        >({
          query: GetRandomCharacterPickDocument,
          variables: { filters: { ...filters, limit: 1, offset } },
          // Not "network-only": the `characters` cache policy appends any page
          // past offset 0 to what is cached at the same filters, so a second
          // pick at the same offset would read back the first pick's id.
          fetchPolicy: "no-cache",
        });
        return {
          id: data.characters.characters[0]?.id ?? null,
          total: data.characters.total,
        };
      }, total);

      if (stale()) return;
      if (id) {
        navigate(characterPath(id));
      } else {
        toast.error("No characters match these filters any more.");
      }
    } catch (err) {
      console.error("Random character pick failed", err);
      if (stale()) return;
      toast.error("Couldn't pick a random character. Try again.");
    } finally {
      if (!stale()) setPicking(false);
    }
  }, [client, filters, total, navigate]);

  return { goToRandomCharacter, picking };
};
