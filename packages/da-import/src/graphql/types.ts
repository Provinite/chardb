export interface LoginResponse {
  login: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface SpeciesByCommunityResponse {
  speciesByCommunity: {
    nodes: Array<{
      id: string;
      name: string;
      communityId: string;
    }>;
  };
}

export interface SpeciesVariantsBySpeciesResponse {
  speciesVariantsBySpecies: {
    nodes: Array<{
      id: string;
      name: string;
      speciesId: string;
    }>;
  };
}

export interface TraitWithEnumValues {
  id: string;
  name: string;
  valueType: string;
  enumValues: Array<{
    id: string;
    name: string;
    order: number;
  }>;
}

export interface TraitsBySpeciesResponse {
  traitsBySpecies: {
    nodes: TraitWithEnumValues[];
    totalCount: number;
    hasNextPage: boolean;
  };
}

export interface CharacterNode {
  id: string;
  name: string;
  registryId: string | null;
  ownerId: string | null;
}

export interface CharactersResponse {
  characters: {
    characters: CharacterNode[];
    total: number;
    hasMore: boolean;
  };
}

export interface CreateCharacterResponse {
  createCharacter: {
    id: string;
    name: string;
    registryId: string | null;
    ownerId: string | null;
  };
}
