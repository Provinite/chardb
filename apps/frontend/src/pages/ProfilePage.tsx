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

export const ProfilePage: React.FC = () => {
  const { username } = useParams();

  return (
    <Container>
      <ComingSoon>
        <h2>User Profile</h2>
        <p>Username: {username}</p>
        <p>User profile pages will be implemented in the next phase.</p>
      </ComingSoon>
    </Container>
  );
};