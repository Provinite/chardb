import { gql } from '@apollo/client';

export const SPECIES_WITH_TRAITS_AND_ENUM_VALUES = gql`
  query SpeciesWithTraitsAndEnumValues($speciesId: ID!) {
    speciesById(id: $speciesId) {
      id
      name
      communityId
      hasImage
      createdAt
      updatedAt
      community {
        id
        name
      }
      traits {
        id
        name
        valueType
        speciesId
        createdAt
        updatedAt
        enumValues {
          id
          name
          order
          traitId
          createdAt
          updatedAt
        }
      }
    }
  }
`;

export const SPECIES_VARIANT_WITH_ENUM_VALUE_SETTINGS = gql`
  query SpeciesVariantWithEnumValueSettings($variantId: ID!) {
    speciesVariantById(id: $variantId) {
      id
      name
      speciesId
      createdAt
      updatedAt
      species {
        id
        name
        communityId
        traits {
          id
          name
          valueType
          enumValues {
            id
            name
            order
          }
        }
      }
      enumValueSettings {
        id
        enumValueId
        speciesVariantId
        createdAt
        updatedAt
        enumValue {
          id
          name
          order
          traitId
        }
      }
    }
  }
`;
