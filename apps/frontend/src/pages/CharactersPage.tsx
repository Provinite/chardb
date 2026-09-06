import React from "react";
import { usePageMeta } from "../lib/pageMeta";
import { CharacterListView } from "../components/CharacterListView";

export const CharactersPage: React.FC = () => {
  usePageMeta({ title: "Browse Characters" });

  return <CharacterListView title="Browse Characters" />;
};
