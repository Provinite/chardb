import React from "react";
import { usePageMeta } from "../lib/pageMeta";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { ButtonLink } from "@chardb/ui";
import { useAuth } from "../contexts/AuthContext";
import { canUseSiteAdmin } from "../lib/siteAdminAccess";

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
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.colors.primary} 0%,
    ${({ theme }) => theme.colors.secondary} 100%
  );
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
  usePageMeta({ title: "Dashboard" });

  const { user } = useAuth();

  return (
    <Container>
      <WelcomeCard>
        <WelcomeTitle>
          Welcome back, {user?.displayName || user?.username}!
        </WelcomeTitle>
        <WelcomeMessage>
          Ready to bring your characters to life? Create new characters, upload
          artwork, or explore what the community has been creating.
        </WelcomeMessage>
      </WelcomeCard>

      <QuickActions>
        <ActionsTitle>Quick Actions</ActionsTitle>
        <ActionButtons>
          {/* Creating a character happens inside a community; the dashboard
              is at the apex, so this picks one first. */}
          <ButtonLink tone="primary">
            <Link to="/my/communities">Create Character</Link>
          </ButtonLink>
          <ButtonLink tone="outline">
            <Link to="/gallery/create">Create Gallery</Link>
          </ButtonLink>
          <ButtonLink tone="outline">
            <Link to="/upload">Create Media</Link>
          </ButtonLink>
          <ButtonLink tone="outline">
            <Link to="/join-community">Join Community</Link>
          </ButtonLink>
          <ButtonLink tone="ghost">
            <Link to="/characters">Browse Characters</Link>
          </ButtonLink>
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
            View and manage all your character profiles. Edit details, upload
            new artwork, or create new characters to expand your collection.
          </CardDescription>
          <ButtonLink tone="outline" size="sm">
            <Link to="/my/characters">View Characters</Link>
          </ButtonLink>
        </DashboardCard>

        <DashboardCard>
          <CardTitle>My Galleries</CardTitle>
          <CardDescription>
            Organize your artwork into themed galleries. Create collections for
            different characters, art styles, or projects.
          </CardDescription>
          <ButtonLink tone="outline" size="sm">
            <Link to="/my/galleries">View Galleries</Link>
          </ButtonLink>
        </DashboardCard>

        <DashboardCard>
          <CardTitle>My Media</CardTitle>
          <CardDescription>
            Browse all your uploaded images and text content. Organize them into
            galleries or assign them to specific characters.
          </CardDescription>
          <ButtonLink tone="outline" size="sm">
            <Link to="/my/media">View Media</Link>
          </ButtonLink>
        </DashboardCard>

        <DashboardCard>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>
            Update your profile information, avatar, bio, and privacy settings.
            Customize how others see your profile.
          </CardDescription>
          <ButtonLink tone="outline" size="sm">
            <Link to="/profile/edit">Edit Profile</Link>
          </ButtonLink>
        </DashboardCard>

        <DashboardCard>
          <CardTitle>Activity Feed</CardTitle>
          <CardDescription>
            See what's happening in your network. View comments, likes, and
            updates from characters and users you follow.
          </CardDescription>
          <ButtonLink tone="outline" size="sm">
            <Link to="/feed">View Feed</Link>
          </ButtonLink>
        </DashboardCard>

        <DashboardCard>
          <CardTitle>Liked Characters</CardTitle>
          <CardDescription>
            Browse through all the characters you've liked. Discover interesting
            personalities and designs that caught your attention.
          </CardDescription>
          <ButtonLink tone="outline" size="sm">
            <Link to="/liked/characters">View Liked Characters</Link>
          </ButtonLink>
        </DashboardCard>

        <DashboardCard>
          <CardTitle>Liked Galleries</CardTitle>
          <CardDescription>
            View all the art galleries you've shown love to. Explore curated
            collections and themed artwork that inspired you.
          </CardDescription>
          <ButtonLink tone="outline" size="sm">
            <Link to="/liked/galleries">View Liked Galleries</Link>
          </ButtonLink>
        </DashboardCard>

        <DashboardCard>
          <CardTitle>Liked Media</CardTitle>
          <CardDescription>
            Access your collection of liked media and content. Revisit the
            pieces that captured your imagination.
          </CardDescription>
          <ButtonLink tone="outline" size="sm">
            <Link to="/liked/media">View Liked Media</Link>
          </ButtonLink>
        </DashboardCard>

        <DashboardCard>
          <CardTitle>Statistics</CardTitle>
          <CardDescription>
            Track your activity with detailed statistics about your characters,
            artwork views, and community engagement.
          </CardDescription>
          <ButtonLink tone="outline" size="sm">
            <Link to="/stats">View Stats</Link>
          </ButtonLink>
        </DashboardCard>

        {user && canUseSiteAdmin(user) && (
          <DashboardCard>
            <CardTitle>Site Administration</CardTitle>
            <CardDescription>
              Manage site-wide settings, invite codes, user accounts, and
              community oversight. Administrative tools for site management.
            </CardDescription>
            <ButtonLink tone="outline" size="sm">
              <Link to="/admin">Admin Panel</Link>
            </ButtonLink>
          </DashboardCard>
        )}
      </Grid>
    </Container>
  );
};
