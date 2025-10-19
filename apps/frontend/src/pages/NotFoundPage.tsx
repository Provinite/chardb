import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { Button } from '@chardb/ui';

const Container = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 4rem ${({ theme }) => theme.spacing.md};
  text-align: center;
`;

const ErrorCode = styled.h1`
  font-size: 6rem;
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const ErrorTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const ErrorDescription = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  line-height: 1.6;
`;

export const NotFoundPage: React.FC = () => {
  return (
    <Container>
      <ErrorCode>404</ErrorCode>
      <ErrorTitle>Page Not Found</ErrorTitle>
      <ErrorDescription>
        The page you're looking for doesn't exist. It might have been moved,
        deleted, or you entered the wrong URL.
      </ErrorDescription>
      <Button as={Link} to="/" variant="primary">
        Go Home
      </Button>
    </Container>
  );
};
