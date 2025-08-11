import { useState, useCallback } from 'react';
import { useLazyQuery } from '@apollo/client';
import { SEARCH_TAGS } from '../graphql/tags';
import type { Tag } from '../generated/graphql';

// Define the UI Tag interface to match what TagInput expects
export interface UITag {
  id: string;
  name: string;
  category?: string;
  color?: string;
}

export const useTagSearch = () => {
  const [suggestions, setSuggestions] = useState<UITag[]>([]);
  
  const [executeSearch, { loading, error }] = useLazyQuery(SEARCH_TAGS, {
    onCompleted: (data) => {
      const tags = data.searchTags?.map((tag: Tag) => ({
        id: tag.id,
        name: tag.name,
        category: tag.category || undefined,
        color: tag.color || undefined,
      })) || [];
      setSuggestions(tags);
    },
    onError: () => {
      setSuggestions([]);
    },
  });

  const searchTags = useCallback(async (query: string): Promise<UITag[]> => {
    if (!query || query.trim().length === 0) {
      // Get popular suggestions
      executeSearch({ 
        variables: { search: undefined, limit: 10 } 
      });
    } else {
      // Search for tags
      executeSearch({ 
        variables: { search: query.trim(), limit: 10 } 
      });
    }
    return [];
  }, [executeSearch]);

  return {
    searchTags,
    suggestions,
    loading,
    error,
  };
};