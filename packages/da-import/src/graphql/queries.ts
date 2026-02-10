export const QUERIES = {
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

  traitsBySpecies: `
    query TraitsBySpecies($speciesId: ID!, $first: Int) {
      traitsBySpecies(speciesId: $speciesId, first: $first) {
        nodes {
          id
          name
          valueType
          enumValues {
            id
            name
            order
          }
        }
        totalCount
        hasNextPage
      }
    }
  `,

  characters: `
    query Characters($filters: CharacterFiltersInput) {
      characters(filters: $filters) {
        characters {
          id
          name
          registryId
          ownerId
        }
        total
        hasMore
      }
    }
  `,
};
