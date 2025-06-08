import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { Button } from '@thclone/ui';
import { useAuth } from '../contexts/AuthContext';

const Hero = styled.section`
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #1e293b 100%);
  position: relative;
  color: white;
  padding: 4rem 0;
  text-align: center;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.3) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(99, 102, 241, 0.3) 0%, transparent 50%);
    pointer-events: none;
  }
`;

const HeroContent = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 0 ${({ theme }) => theme.spacing.md};
  position: relative;
  z-index: 1;
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

const HeroPrimaryButton = styled(Button)`
  background: white;
  color: #1e293b;
  border: none;
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.xl};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  min-width: 160px;
  
  &:hover:not(:disabled) {
    background: #f8fafc;
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
`;

const HeroSecondaryButton = styled(Button)`
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.xl};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  min-width: 160px;
  backdrop-filter: blur(10px);
  
  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
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
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.spacing.xl};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  box-shadow: ${({ theme }) => theme.shadows.md};
  text-align: center;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.lg};
  }
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
                <HeroPrimaryButton as={Link} to="/dashboard" size="lg">
                  Go to Dashboard
                </HeroPrimaryButton>
                <HeroSecondaryButton as={Link} to="/character/create" size="lg">
                  Create Character
                </HeroSecondaryButton>
              </>
            ) : (
              <>
                <HeroPrimaryButton as={Link} to="/signup" size="lg">
                  Get Started
                </HeroPrimaryButton>
                <HeroSecondaryButton as={Link} to="/characters" size="lg">
                  Browse Characters
                </HeroSecondaryButton>
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