import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { Button } from '@thclone/ui';
import { useAuth } from '../contexts/AuthContext';

const Hero = styled.section`
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.primary} 0%, ${({ theme }) => theme.colors.secondary} 100%);
  color: white;
  padding: 4rem 0;
  text-align: center;
`;

const HeroContent = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 0 ${({ theme }) => theme.spacing.md};
`;

const HeroTitle = styled.h1`
  font-size: 3rem;
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const HeroSubtitle = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  opacity: 0.9;
`;

const HeroActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  justify-content: center;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
  }
`;

const FeaturesSection = styled.section`
  padding: 4rem 0;
  background-color: ${({ theme }) => theme.colors.surface};
`;

const FeaturesContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 ${({ theme }) => theme.spacing.md};
`;

const FeaturesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing.xl};
  margin-top: ${({ theme }) => theme.spacing.xl};
`;

const FeatureCard = styled.div`
  background: white;
  padding: ${({ theme }) => theme.spacing.xl};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  box-shadow: ${({ theme }) => theme.shadows.md};
  text-align: center;
`;

const FeatureIcon = styled.div`
  font-size: 3rem;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const FeatureTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const FeatureDescription = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.6;
`;

const SectionTitle = styled.h2`
  font-size: 2.5rem;
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  text-align: center;
  color: ${({ theme }) => theme.colors.text.primary};
`;

export const HomePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <>
      <Hero>
        <HeroContent>
          <HeroTitle>Your Characters, Your Stories</HeroTitle>
          <HeroSubtitle>
            Create, share, and discover amazing characters in our vibrant community.
            Build your character profiles, showcase artwork, and connect with fellow creators.
          </HeroSubtitle>
          <HeroActions>
            {user ? (
              <>
                <Button as={Link} to="/dashboard" size="lg">
                  Go to Dashboard
                </Button>
                <Button as={Link} to="/character/create" variant="outline" size="lg">
                  Create Character
                </Button>
              </>
            ) : (
              <>
                <Button as={Link} to="/signup" size="lg">
                  Get Started
                </Button>
                <Button as={Link} to="/characters" variant="outline" size="lg">
                  Browse Characters
                </Button>
              </>
            )}
          </HeroActions>
        </HeroContent>
      </Hero>

      <FeaturesSection>
        <FeaturesContainer>
          <SectionTitle>Everything You Need</SectionTitle>
          <FeaturesGrid>
            <FeatureCard>
              <FeatureIcon>🎨</FeatureIcon>
              <FeatureTitle>Character Profiles</FeatureTitle>
              <FeatureDescription>
                Create detailed character profiles with custom fields, personality traits,
                backstories, and more. Organize everything in one place.
              </FeatureDescription>
            </FeatureCard>

            <FeatureCard>
              <FeatureIcon>🖼️</FeatureIcon>
              <FeatureTitle>Image Galleries</FeatureTitle>
              <FeatureDescription>
                Upload and organize artwork, reference images, and character art.
                Create themed galleries and share your visual stories.
              </FeatureDescription>
            </FeatureCard>

            <FeatureCard>
              <FeatureIcon>🌐</FeatureIcon>
              <FeatureTitle>Community Features</FeatureTitle>
              <FeatureDescription>
                Connect with other creators, comment on characters, and discover
                amazing artwork from the community.
              </FeatureDescription>
            </FeatureCard>

            <FeatureCard>
              <FeatureIcon>🔒</FeatureIcon>
              <FeatureTitle>Privacy Controls</FeatureTitle>
              <FeatureDescription>
                Full control over who can see your content. Set characters and
                galleries to public, unlisted, or private.
              </FeatureDescription>
            </FeatureCard>

            <FeatureCard>
              <FeatureIcon>🏷️</FeatureIcon>
              <FeatureTitle>Tagging System</FeatureTitle>
              <FeatureDescription>
                Organize and discover content with our flexible tagging system.
                Find exactly what you're looking for.
              </FeatureDescription>
            </FeatureCard>

            <FeatureCard>
              <FeatureIcon>💱</FeatureIcon>
              <FeatureTitle>Character Trading</FeatureTitle>
              <FeatureDescription>
                Mark characters as sellable or tradeable. Connect with others
                to exchange and trade your creative works.
              </FeatureDescription>
            </FeatureCard>
          </FeaturesGrid>
        </FeaturesContainer>
      </FeaturesSection>
    </>
  );
};