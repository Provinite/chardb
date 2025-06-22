import React from 'react';
import styled from 'styled-components';

const FooterContainer = styled.footer`
  background-color: ${({ theme }) => theme.colors.surface};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.spacing.lg} 0;
  margin-top: auto;
`;

const FooterContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 ${({ theme }) => theme.spacing.md};
  text-align: center;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

export const Footer: React.FC = () => {
  const version = import.meta.env.VITE_VERSION || 'unknown';
  
  return (
    <FooterContainer>
      <FooterContent>
        <p>&copy; 2024 CharDB. A character hosting platform built with ❤️</p>
        <p>Version: {version}</p>
      </FooterContent>
    </FooterContainer>
  );
};