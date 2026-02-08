import React from 'react';
import { Spotlight } from '@mantine/spotlight';
import { useSpotlightActions } from './useSpotlightActions';

export const SpotlightNavigation: React.FC = () => {
  const actions = useSpotlightActions();

  return (
    <Spotlight
      actions={actions}
      highlightQuery
      limit={7}
      scrollable
      maxHeight={400}
      nothingFound="No pages found..."
      searchProps={{ placeholder: 'Search pages...' }}
    />
  );
};
