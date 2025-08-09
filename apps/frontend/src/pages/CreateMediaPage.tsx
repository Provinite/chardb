import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { Button } from '@chardb/ui';

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl};
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing.xxl};
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize.xxl};
  margin: 0 0 ${({ theme }) => theme.spacing.md} 0;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0;
`;

const OptionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing.xl};
  margin-bottom: ${({ theme }) => theme.spacing.xxl};
`;

const OptionCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.xl};
  text-align: center;
  transition: all 0.2s ease-in-out;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const OptionIcon = styled.div`
  font-size: 3rem;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const OptionTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  margin: 0 0 ${({ theme }) => theme.spacing.md} 0;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const OptionDescription = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0 0 ${({ theme }) => theme.spacing.lg} 0;
  line-height: 1.5;
`;

const OptionButton = styled(Button)`
  width: 100%;
`;

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-decoration: none;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
  
  &::before {
    content: '← ';
    margin-right: ${({ theme }) => theme.spacing.xs};
  }
`;

export const CreateMediaPage: React.FC = () => {
  return (
    <Container>
      <Header>
        <Title>Create New Media</Title>
        <Subtitle>Choose the type of content you'd like to create</Subtitle>
      </Header>

      <OptionsGrid>
        <OptionCard>
          <OptionIcon>🖼️</OptionIcon>
          <OptionTitle>Upload Image</OptionTitle>
          <OptionDescription>
            Upload artwork, photos, or any visual content. Support for JPEG, PNG, GIF, and WebP formats.
            Perfect for character art, reference images, and visual galleries.
          </OptionDescription>
          <OptionButton as={Link} to="/image/upload" variant="primary">
            Upload Image
          </OptionButton>
        </OptionCard>

        <OptionCard>
          <OptionIcon>📝</OptionIcon>
          <OptionTitle>Create Text Content</OptionTitle>
          <OptionDescription>
            Write stories, character descriptions, world-building notes, or any textual content.
            Supports both plain text and Markdown formatting.
          </OptionDescription>
          <OptionButton as={Link} to="/text/create" variant="primary">
            Create Text
          </OptionButton>
        </OptionCard>
      </OptionsGrid>

      <BackLink to="/dashboard">Back to Dashboard</BackLink>
    </Container>
  );
};

export default CreateMediaPage;