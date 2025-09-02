import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { Button } from '@chardb/ui';
import { useAuth } from '../contexts/AuthContext';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 ${({ theme }) => theme.spacing.md};
`;

const Header = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize.xxl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const DashboardCard = styled.div`
  background: ${({ theme }) => theme.colors.background};
  padding: ${({ theme }) => theme.spacing.lg};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  box-shadow: ${({ theme }) => theme.shadows.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.lg};
  }
`;

const CardTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const CardDescription = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  line-height: 1.5;
`;

const QuickActions = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  padding: ${({ theme }) => theme.spacing.lg};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const ActionsTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  flex-wrap: wrap;
`;

const WelcomeCard = styled.div`
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.primary} 0%, ${({ theme }) => theme.colors.secondary} 100%);
  color: white;
  padding: ${({ theme }) => theme.spacing.xl};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const WelcomeTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const WelcomeMessage = styled.p`
  opacity: 0.9;
  line-height: 1.6;
`;

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <Container>
      <WelcomeCard>
        <WelcomeTitle>Welcome back, {user?.displayName || user?.username}!</WelcomeTitle>
        <WelcomeMessage>
          Ready to bring your characters to life? Create new characters, upload artwork, 
          or explore what the community has been creating.
        </WelcomeMessage>
      </WelcomeCard>

      <QuickActions>
        <ActionsTitle>Quick Actions</ActionsTitle>
        <ActionButtons>
          <Button as={Link} to="/character/create" variant="primary">
            Create Character
          </Button>
          <Button as={Link} to="/gallery/create" variant="outline">
            Create Gallery
          </Button>
          <Button as={Link} to="/upload" variant="outline">
            Create Media
          </Button>
          <Button as={Link} to="/join-community" variant="outline">
            Join Community
          </Button>
          <Button as={Link} to="/characters" variant="ghost">
            Browse Characters
          </Button>
        </ActionButtons>
      </QuickActions>

      <Header>
        <Title>Your Dashboard</Title>
        <Subtitle>Manage your characters, galleries, and profile</Subtitle>
      </Header>

      <Grid>
        <DashboardCard>
          <CardTitle>My Characters</CardTitle>
          <CardDescription>
            View and manage all your character profiles. Edit details, upload new artwork,
            or create new characters to expand your collection.
          </CardDescription>
          <Button as={Link} to="/my/characters" variant="outline" size="sm">
            View Characters
          </Button>
        </DashboardCard>

        <DashboardCard>
          <CardTitle>My Galleries</CardTitle>
          <CardDescription>
            Organize your artwork into themed galleries. Create collections for different
            characters, art styles, or projects.
          </CardDescription>
          <Button as={Link} to="/my/galleries" variant="outline" size="sm">
            View Galleries
          </Button>
        </DashboardCard>

        <DashboardCard>
          <CardTitle>My Media</CardTitle>
          <CardDescription>
            Browse all your uploaded images and text content. Organize them into galleries
            or assign them to specific characters.
          </CardDescription>
          <Button as={Link} to="/my/media" variant="outline" size="sm">
            View Media
          </Button>
        </DashboardCard>

        <DashboardCard>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>
            Update your profile information, avatar, bio, and privacy settings.
            Customize how others see your profile.
          </CardDescription>
          <Button as={Link} to="/profile/edit" variant="outline" size="sm">
            Edit Profile
          </Button>
        </DashboardCard>

        <DashboardCard>
          <CardTitle>Activity Feed</CardTitle>
          <CardDescription>
            See what's happening in your network. View comments, likes, and updates
            from characters and users you follow.
          </CardDescription>
          <Button as={Link} to="/feed" variant="outline" size="sm">
            View Feed
          </Button>
        </DashboardCard>

        <DashboardCard>
          <CardTitle>Liked Characters</CardTitle>
          <CardDescription>
            Browse through all the characters you've liked. Discover interesting
            personalities and designs that caught your attention.
          </CardDescription>
          <Button as={Link} to="/liked/characters" variant="outline" size="sm">
            View Liked Characters
          </Button>
        </DashboardCard>

        <DashboardCard>
          <CardTitle>Liked Galleries</CardTitle>
          <CardDescription>
            View all the art galleries you've shown love to. Explore curated
            collections and themed artwork that inspired you.
          </CardDescription>
          <Button as={Link} to="/liked/galleries" variant="outline" size="sm">
            View Liked Galleries
          </Button>
        </DashboardCard>

        <DashboardCard>
          <CardTitle>Liked Media</CardTitle>
          <CardDescription>
            Access your collection of liked media and content. Revisit the
            pieces that captured your imagination.
          </CardDescription>
          <Button as={Link} to="/liked/media" variant="outline" size="sm">
            View Liked Media
          </Button>
        </DashboardCard>

        <DashboardCard>
          <CardTitle>Statistics</CardTitle>
          <CardDescription>
            Track your activity with detailed statistics about your characters,
            artwork views, and community engagement.
          </CardDescription>
          <Button as={Link} to="/stats" variant="outline" size="sm">
            View Stats
          </Button>
        </DashboardCard>

        {user?.canCreateInviteCode && (
          <DashboardCard>
            <CardTitle>Site Administration</CardTitle>
            <CardDescription>
              Manage site-wide settings, invite codes, user accounts, and community oversight.
              Administrative tools for site management.
            </CardDescription>
            <Button as={Link} to="/admin" variant="outline" size="sm">
              Admin Panel
            </Button>
          </DashboardCard>
        )}
      </Grid>
    </Container>
  );
};