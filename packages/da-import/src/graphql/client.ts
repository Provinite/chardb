import { logger } from "../utils/logger";
import { MUTATIONS } from "./mutations";
import { QUERIES } from "./queries";
import type {
  LoginResponse,
  SpeciesByCommunityResponse,
  SpeciesVariantsBySpeciesResponse,
  TraitsBySpeciesResponse,
  CharactersResponse,
  CreateCharacterResponse,
  CharacterNode,
} from "./types";

interface GraphQLError {
  message: string;
  extensions?: { code: string };
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
}

export class CharDBClient {
  private token?: string;

  constructor(private readonly endpoint: string) {}

  setToken(token: string): void {
    this.token = token;
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
      const errorMessage =
        json.errors?.map((e) => e.message).join(", ") ?? response.statusText;
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

  async login(email: string, password: string): Promise<string> {
    const data = await this.request<LoginResponse>(MUTATIONS.login, {
      input: { email, password },
    });
    const token = data.login.accessToken;
    this.setToken(token);
    logger.info("Logged in successfully");
    return token;
  }

  async getSpeciesByCommunity(communityId: string): Promise<SpeciesByCommunityResponse["speciesByCommunity"]["nodes"]> {
    const data = await this.request<SpeciesByCommunityResponse>(
      QUERIES.speciesByCommunity,
      { communityId, first: 100 }
    );
    return data.speciesByCommunity.nodes;
  }

  async getVariantsBySpecies(speciesId: string): Promise<SpeciesVariantsBySpeciesResponse["speciesVariantsBySpecies"]["nodes"]> {
    const data = await this.request<SpeciesVariantsBySpeciesResponse>(
      QUERIES.speciesVariantsBySpecies,
      { speciesId, first: 100 }
    );
    return data.speciesVariantsBySpecies.nodes;
  }

  async getTraitsBySpecies(speciesId: string): Promise<TraitsBySpeciesResponse["traitsBySpecies"]["nodes"]> {
    const data = await this.request<TraitsBySpeciesResponse>(
      QUERIES.traitsBySpecies,
      { speciesId, first: 100 }
    );
    return data.traitsBySpecies.nodes;
  }

  async getAllCharactersForSpecies(speciesId: string): Promise<CharacterNode[]> {
    const allCharacters: CharacterNode[] = [];
    let offset = 0;
    const limit = 100;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const data = await this.request<CharactersResponse>(QUERIES.characters, {
        filters: { speciesId, limit, offset },
      });

      allCharacters.push(...data.characters.characters);

      if (!data.characters.hasMore) {
        break;
      }
      offset += limit;
    }

    return allCharacters;
  }

  async createCharacter(input: {
    name: string;
    registryId: string;
    speciesId: string;
    speciesVariantId: string;
    traitValues: Array<{ traitId: string; value: string }>;
    pendingOwner: { provider: string; providerAccountId: string };
    assignToSelf: boolean;
    visibility: string;
  }): Promise<CreateCharacterResponse["createCharacter"]> {
    const data = await this.request<CreateCharacterResponse>(
      MUTATIONS.createCharacter,
      { input }
    );
    return data.createCharacter;
  }
}
