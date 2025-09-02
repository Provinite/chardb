import React from 'react';
import styled from 'styled-components';
import { useParams, Link } from 'react-router-dom';
import { Database, Users, Settings, List, FileText } from 'lucide-react';
import { Title, Subtitle, Card } from '@chardb/ui';

/**
 * Community Administration Interface
 * 
 * Central hub for community-specific administration tasks. Provides access to
 * species management, member management, role configuration, and other
 * community-scoped administrative functions.
 */

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const Breadcrumb = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 2rem;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.muted};
  
  a {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }
`;

const Header = styled.div`
  margin-bottom: 3rem;
`;

const AdminGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
`;

const AdminCard = styled(Card).attrs({ as: Link })`
  text-decoration: none;
  display: block;
`;

const CardIcon = styled.div`
  width: 3rem;
  height: 3rem;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.primary}15;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.colors.primary};
`;

const CardTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 0.5rem 0;
`;

const CardDescription = styled.p`
  color: ${({ theme }) => theme.colors.text.muted};
  margin: 0;
  line-height: 1.4;
`;

const PermissionNote = styled.div`
  background: ${({ theme }) => theme.colors.primary}10;
  border: 1px solid ${({ theme }) => theme.colors.primary}30;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 2rem;
  
  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.875rem;
  }
`;

export const CommunityAdminPage: React.FC = () => {
  const { communityId } = useParams<{ communityId: string }>();

  if (!communityId) {
    return (
      <Container>
        <Title>Community Administration</Title>
        <Subtitle>Community ID is required</Subtitle>
      </Container>
    );
  }

  // Mock community data - in real implementation, fetch from GraphQL
  const communityName = "Fantasy Realm";

  // Mock user permissions - in real implementation, these would come from user context/role
  const userPermissions = {
    canCreateSpecies: true,
    canEditSpecies: true,
    canCreateRole: true,
    canEditRole: true,
    canCreateInviteCode: true,
    canListInviteCodes: true,
  };

  return (
    <Container>
      <Breadcrumb>
        <Link to="/communities">My Communities</Link>
        <span>/</span>
        <span>{communityName}</span>
        <span>/</span>
        <span>Administration</span>
      </Breadcrumb>

      <Header>
        <Title>Community Administration</Title>
        <Subtitle>
          Manage {communityName} settings, content, and members
        </Subtitle>
      </Header>

      <PermissionNote>
        <p>
          Your administrative access is based on your role permissions within this community.
          Contact a community administrator if you need additional permissions.
        </p>
      </PermissionNote>

      <AdminGrid>
        {/* Species Management - Core feature */}
        {(userPermissions.canCreateSpecies || userPermissions.canEditSpecies) && (
          <AdminCard to={`/communities/${communityId}/species`}>
            <CardIcon>
              <Database size={24} />
            </CardIcon>
            <CardTitle>Species Management</CardTitle>
            <CardDescription>
              Create and configure species, traits, and variants for your community.
              Define character templates and customization options.
            </CardDescription>
          </AdminCard>
        )}

        {/* Community Members */}
        <AdminCard to={`/communities/${communityId}/members`}>
          <CardIcon>
            <Users size={24} />
          </CardIcon>
          <CardTitle>Member Management</CardTitle>
          <CardDescription>
            View community members, manage roles, and handle membership requests.
            Monitor community activity and engagement.
          </CardDescription>
        </AdminCard>

        {/* Roles & Permissions */}
        {(userPermissions.canCreateRole || userPermissions.canEditRole) && (
          <AdminCard to={`/communities/${communityId}/roles`}>
            <CardIcon>
              <Settings size={24} />
            </CardIcon>
            <CardTitle>Roles & Permissions</CardTitle>
            <CardDescription>
              Configure community roles and permissions. Set up moderation hierarchies
              and access control for community features.
            </CardDescription>
          </AdminCard>
        )}

        {/* Invite Codes */}
        {(userPermissions.canCreateInviteCode || userPermissions.canListInviteCodes) && (
          <AdminCard to={`/communities/${communityId}/invite-codes`}>
            <CardIcon>
              <List size={24} />
            </CardIcon>
            <CardTitle>Invite Management</CardTitle>
            <CardDescription>
              Create and manage community invite codes. Control new member onboarding
              and role assignment through invitation links.
            </CardDescription>
          </AdminCard>
        )}

        {/* Community Settings */}
        <AdminCard to={`/communities/${communityId}/settings`}>
          <CardIcon>
            <Settings size={24} />
          </CardIcon>
          <CardTitle>Community Settings</CardTitle>
          <CardDescription>
            Configure community information, appearance, and general settings.
            Manage community description, rules, and public visibility.
          </CardDescription>
        </AdminCard>

        {/* Content Moderation */}
        <AdminCard to={`/communities/${communityId}/moderation`}>
          <CardIcon>
            <FileText size={24} />
          </CardIcon>
          <CardTitle>Content Moderation</CardTitle>
          <CardDescription>
            Review reported content, manage character approvals, and maintain
            community standards and guidelines.
          </CardDescription>
        </AdminCard>
      </AdminGrid>
    </Container>
  );
};