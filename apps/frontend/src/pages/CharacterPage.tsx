import React from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 ${({ theme }) => theme.spacing.md};
`;

const ComingSoon = styled.div`
  text-align: center;
  padding: 4rem 0;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

export const CharacterPage: React.FC = () => {
  const { id } = useParams();

  return (
    <Container>
      <ComingSoon>
        <h2>Character Profile</h2>
        <p>Character ID: {id}</p>
        <p>Individual character pages will be implemented in the next phase.</p>
      </ComingSoon>
    </Container>
  );
};