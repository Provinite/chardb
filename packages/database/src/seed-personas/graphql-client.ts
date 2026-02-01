/**
 * Simple fetch-based GraphQL client for seeding operations
 */

interface GraphQLError {
  message: string;
  extensions?: { code: string };
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
}

export class GraphQLClient {
  private endpoint: string;
  private token?: string;

  constructor(endpoint = "http://localhost:4000/graphql") {
    this.endpoint = endpoint;
  }

  setToken(token: string): void {
    this.token = token;
  }

  clearToken(): void {
    this.token = undefined;
  }

  async request<T>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables }),
    });

    const json = (await response.json()) as GraphQLResponse<T>;

    if (!response.ok) {
      const errorMessage = json.errors?.map((e) => e.message).join(", ") ?? response.statusText;
      throw new Error(`HTTP error: ${response.status} - ${errorMessage}`);
    }

    if (json.errors?.length) {
      const errorMessages = json.errors.map((e) => e.message).join(", ");
      throw new Error(`GraphQL Error: ${errorMessages}`);
    }

    if (!json.data) {
      throw new Error("GraphQL response missing data");
    }

    return json.data;
  }
}

// GraphQL mutations and queries
export const MUTATIONS = {
  login: `
    mutation Login($input: LoginInput!) {
      login(input: $input) {
        accessToken
        refreshToken
      }
    }
  `,

  createCommunity: `
    mutation CreateCommunity($input: CreateCommunityInput!) {
      createCommunity(createCommunityInput: $input) {
        id
        name
      }
    }
  `,

  createRole: `
    mutation CreateRole($input: CreateRoleInput!) {
      createRole(createRoleInput: $input) {
        id
        name
        communityId
      }
    }
  `,

  createCommunityMember: `
    mutation CreateCommunityMember($input: CreateCommunityMemberInput!) {
      createCommunityMember(createCommunityMemberInput: $input) {
        id
        userId
        roleId
      }
    }
  `,

  createSpecies: `
    mutation CreateSpecies($input: CreateSpeciesInput!) {
      createSpecies(createSpeciesInput: $input) {
        id
        name
        communityId
      }
    }
  `,

  createSpeciesVariant: `
    mutation CreateSpeciesVariant($input: CreateSpeciesVariantInput!) {
      createSpeciesVariant(createSpeciesVariantInput: $input) {
        id
        name
        speciesId
      }
    }
  `,

  createCharacter: `
    mutation CreateCharacter($input: CreateCharacterInput!) {
      createCharacter(input: $input) {
        id
        name
        ownerId
      }
    }
  `,
};

export const QUERIES = {
  communities: `
    query Communities($first: Int!) {
      communities(first: $first) {
        nodes {
          id
          name
        }
      }
    }
  `,

  rolesByCommunity: `
    query RolesByCommunity($communityId: ID!, $first: Int!) {
      rolesByCommunity(communityId: $communityId, first: $first) {
        nodes {
          id
          name
          communityId
        }
      }
    }
  `,

  speciesByCommunity: `
    query SpeciesByCommunity($communityId: ID!, $first: Int!) {
      speciesByCommunity(communityId: $communityId, first: $first) {
        nodes {
          id
          name
          communityId
        }
      }
    }
  `,

  speciesVariantsBySpecies: `
    query SpeciesVariantsBySpecies($speciesId: ID!, $first: Int!) {
      speciesVariantsBySpecies(speciesId: $speciesId, first: $first) {
        nodes {
          id
          name
          speciesId
        }
      }
    }
  `,

  characters: `
    query Characters($filters: CharacterFiltersInput) {
      characters(filters: $filters) {
        characters {
          id
          name
          ownerId
        }
      }
    }
  `,
};

// Response types
export interface LoginResponse {
  login: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface CreateCommunityResponse {
  createCommunity: {
    id: string;
    name: string;
  };
}

export interface CreateRoleResponse {
  createRole: {
    id: string;
    name: string;
    communityId: string;
  };
}

export interface CreateCommunityMemberResponse {
  createCommunityMember: {
    id: string;
    userId: string;
    roleId: string;
  };
}

export interface CreateSpeciesResponse {
  createSpecies: {
    id: string;
    name: string;
    communityId: string;
  };
}

export interface CreateSpeciesVariantResponse {
  createSpeciesVariant: {
    id: string;
    name: string;
    speciesId: string;
  };
}

export interface CreateCharacterResponse {
  createCharacter: {
    id: string;
    name: string;
    ownerId: string;
  };
}

export interface CommunitiesResponse {
  communities: {
    nodes: Array<{
      id: string;
      name: string;
    }>;
  };
}

export interface RolesByCommunityResponse {
  rolesByCommunity: {
    nodes: Array<{
      id: string;
      name: string;
      communityId: string;
    }>;
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

export interface CharactersResponse {
  characters: {
    characters: Array<{
      id: string;
      name: string;
      ownerId: string | null;
    }>;
  };
}
