import React from 'react';
import styled from 'styled-components';

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 0 ${({ theme }) => theme.spacing.md};
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize.xxl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const ComingSoon = styled.div`
  text-align: center;
  padding: 4rem 0;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

export const CreateCharacterPage: React.FC = () => {
  return (
    <Container>
      <Title>Create Character</Title>
      <ComingSoon>
        <h2>Coming Soon!</h2>
        <p>Character creation form will be implemented in the next phase.</p>
      </ComingSoon>
    </Container>
  );
};