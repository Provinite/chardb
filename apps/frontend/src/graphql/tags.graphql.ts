import { gql } from '@apollo/client';

export const SEARCH_TAGS = gql`
  query SearchTags($search: String, $limit: Float) {
    searchTags(search: $search, limit: $limit) {
      id
      name
      displayName
      category
      color
      createdAt
    }
  }
`;

// Re-export generated types and hooks after regeneration
export {
  useSearchTagsQuery,
  type SearchTagsQuery,
  type SearchTagsQueryVariables,
  type Tag,
} from '../generated/graphql';
