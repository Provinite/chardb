import React, { useState } from "react";
import { CharacterTypeahead, type SearchSelectOption } from "@chardb/ui";
import { useGetMyCharactersForImageUploadQuery } from "../generated/graphql";

const LIMIT = 50;

interface MyCharacterTypeaheadProps {
  value: SearchSelectOption | null;
  onChange: (character: SearchSelectOption | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Picks one of the signed-in user's own characters: the shared
 * `CharacterTypeahead`, fed by `myCharactersForImageUpload`. Lists them as
 * soon as it opens, since most people have few enough to browse.
 */
export const MyCharacterTypeahead: React.FC<MyCharacterTypeaheadProps> = ({
  value,
  onChange,
  placeholder,
  disabled,
}) => {
  const [search, setSearch] = useState("");
  const { data, loading, error } = useGetMyCharactersForImageUploadQuery({
    variables: {
      filters: search ? { limit: LIMIT, search } : { limit: LIMIT },
    },
  });

  const options = (data?.myCharactersForImageUpload.characters ?? []).map(
    (character) => ({
      id: character.id,
      name: character.name,
      subtitle: character.species?.name ?? null,
    }),
  );

  return (
    <CharacterTypeahead
      value={value}
      onChange={onChange}
      onSearch={setSearch}
      options={options}
      loading={loading}
      error={error ? "Could not load your characters" : undefined}
      placeholder={placeholder}
      disabled={disabled}
      minSearchLength={0}
    />
  );
};
