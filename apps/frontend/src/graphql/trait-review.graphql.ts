import { gql } from '@apollo/client';

export const TRAIT_VALUE_FIELDS_FRAGMENT = gql`
  fragment TraitValueFields on CharacterTraitValue {
    traitId
    value
    trait {
      name
      valueType
      allowsMultipleValues
    }
    enumValue {
      name
      color {
        id
        hexCode
      }
    }
  }
`;

export const TRAIT_REVIEW_QUEUE = gql`
  query TraitReviewQueue(
    $communityId: ID!
    $filters: TraitReviewQueueFiltersInput
    $first: Int
    $offset: Int
  ) {
    traitReviewQueue(
      communityId: $communityId
      filters: $filters
      first: $first
      offset: $offset
    ) {
      items {
        review {
          id
          characterId
          status
          source
          proposedTraitValues {
            ...TraitValueFields
          }
          previousTraitValues {
            ...TraitValueFields
          }
          appliedTraitValues {
            ...TraitValueFields
          }
          rejectionReason
          resolvedAt
          createdAt
          resolvedBy {
            id
            username
            displayName
          }
        }
        characterName
        characterId
        registryId
        speciesName
        variantName
      }
      total
      hasMore
    }
  }
  ${TRAIT_VALUE_FIELDS_FRAGMENT}
`;

export const PENDING_TRAIT_REVIEW_COUNT = gql`
  query PendingTraitReviewCount($communityId: ID!) {
    pendingTraitReviewCount(communityId: $communityId)
  }
`;

export const CHARACTER_TRAIT_REVIEW = gql`
  query CharacterTraitReview($characterId: ID!) {
    characterTraitReview(characterId: $characterId) {
      id
      status
      source
      proposedTraitValues {
        ...TraitValueFields
      }
      previousTraitValues {
        ...TraitValueFields
      }
      rejectionReason
      createdAt
    }
  }
  ${TRAIT_VALUE_FIELDS_FRAGMENT}
`;

export const APPROVE_TRAIT_REVIEW = gql`
  mutation ApproveTraitReview($input: ApproveTraitReviewInput!) {
    approveTraitReview(input: $input) {
      id
      status
      resolvedAt
      resolvedBy {
        id
        username
      }
    }
  }
`;

export const REJECT_TRAIT_REVIEW = gql`
  mutation RejectTraitReview($input: RejectTraitReviewInput!) {
    rejectTraitReview(input: $input) {
      id
      status
      rejectionReason
      resolvedAt
      resolvedBy {
        id
        username
      }
    }
  }
`;

export const EDIT_AND_APPROVE_TRAIT_REVIEW = gql`
  mutation EditAndApproveTraitReview($input: EditAndApproveTraitReviewInput!) {
    editAndApproveTraitReview(input: $input) {
      id
      status
      appliedTraitValues {
        ...TraitValueFields
      }
      resolvedAt
      resolvedBy {
        id
        username
      }
    }
  }
  ${TRAIT_VALUE_FIELDS_FRAGMENT}
`;

export const CREATE_TRAIT_REVIEW = gql`
  mutation CreateTraitReview($input: CreateTraitReviewInput!) {
    createTraitReview(input: $input) {
      id
      status
      source
      characterId
      createdAt
    }
  }
`;
