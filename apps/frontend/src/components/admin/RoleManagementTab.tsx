import React from 'react';
import styled from 'styled-components';
import { 
  Shield,
  Trash2,
  Edit,
  Plus
} from 'lucide-react';
import { 
  Button,
  Heading3,
  SmallText,
  HelpText,
  Card
} from '@chardb/ui';
import {
  useRolesByCommunityDetailedQuery,
  RolesByCommunityDetailedQuery
} from '../../generated/graphql';
import { PERMISSION_LABELS } from '../../lib/permissions';

/**
 * Role Management Tab Component
 * 
 * Displays all community roles with management actions.
 * Integrates with RoleEditor for creating and editing roles.
 * 
 * Features:
 * - List all community roles
 * - Show role details and member counts
 * - Edit and delete role actions
 * - Create new roles
 * - Visual indicators for system roles
 */

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
`;

const HeaderInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const HeaderIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.primary}20;
  color: ${({ theme }) => theme.colors.primary};
`;

const HeaderText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const RoleGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
`;

const RoleCard = styled(Card)`
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const RoleHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const RoleTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const RoleIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.primary}15;
  color: ${({ theme }) => theme.colors.primary};
`;

const RoleName = styled(Heading3)`
  margin: 0;
`;

const RoleActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ActionButton = styled(Button)`
  padding: 0.375rem;
  min-width: auto;
`;

const RoleDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const RoleStats = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: ${({ theme }) => theme.colors.background};
  border-radius: 6px;
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
`;

const StatValue = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const StatLabel = styled(SmallText)`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const PermissionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const PermissionItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 4px;
  font-size: 0.875rem;
`;

const PermissionStatus = styled.div<{ $granted: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: ${({ theme, $granted }) => 
    $granted ? theme.colors.success : theme.colors.text.muted};
  font-weight: ${({ $granted }) => $granted ? '500' : '400'};
  
  &:before {
    content: ${({ $granted }) => $granted ? '"✓"' : '"✗"'};
    font-size: 0.75rem;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
  gap: 1rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const EmptyIcon = styled.div`
  color: ${({ theme }) => theme.colors.text.muted};
  opacity: 0.5;
`;

type RoleFromQuery = NonNullable<RolesByCommunityDetailedQuery['rolesByCommunity']>['nodes'][0];

interface RoleManagementTabProps {
  communityId: string;
  onEditRole?: (role: RoleFromQuery) => void;
  onCreateRole?: () => void;
}


export const RoleManagementTab: React.FC<RoleManagementTabProps> = ({
  communityId,
  onEditRole,
  onCreateRole
}) => {
  // Fetch roles for the community
  const { 
    data: rolesData, 
    loading: rolesLoading,
    error: rolesError
  } = useRolesByCommunityDetailedQuery({
    variables: { communityId, first: 50, after: null },
    skip: !communityId,
  });

  if (rolesLoading) {
    return (
      <Container>
        <EmptyState>
          <Shield size={48} />
          <SmallText>Loading roles...</SmallText>
        </EmptyState>
      </Container>
    );
  }

  if (rolesError) {
    return (
      <Container>
        <EmptyState>
          <Shield size={48} />
          <Heading3>Error Loading Roles</Heading3>
          <HelpText>
            Unable to load community roles. Please try refreshing the page.
          </HelpText>
        </EmptyState>
      </Container>
    );
  }

  const roles = rolesData?.rolesByCommunity?.nodes || [];

  if (roles.length === 0) {
    return (
      <Container>
        <Header>
          <HeaderInfo>
            <HeaderIcon>
              <Shield size={20} />
            </HeaderIcon>
            <HeaderText>
              <Heading3>Role Management</Heading3>
              <SmallText style={{ margin: 0, color: 'muted' }}>
                No roles found in this community
              </SmallText>
            </HeaderText>
          </HeaderInfo>
          <Button
            variant="primary"
            onClick={onCreateRole}
            icon={<Plus size={16} />}
          >
            Create First Role
          </Button>
        </Header>
        
        <EmptyState>
          <EmptyIcon>
            <Shield size={64} />
          </EmptyIcon>
          <Heading3>No Roles Yet</Heading3>
          <HelpText>
            Create your first community role to start managing member permissions and access levels.
          </HelpText>
        </EmptyState>
      </Container>
    );
  }

  const getPermissionCount = (role: RoleFromQuery) => {
    const permissions = [
      role.canCreateSpecies,
      role.canEditSpecies,
      role.canCreateCharacter,
      role.canCreateOrphanedCharacter,
      role.canEditCharacter,
      role.canEditOwnCharacter,
      role.canManageItems,
      role.canGrantItems,
      role.canCreateInviteCode,
      role.canListInviteCodes,
      role.canCreateRole,
      role.canEditRole
    ];
    return permissions.filter(Boolean).length;
  };

  return (
    <Container>
      <Header>
        <HeaderInfo>
          <HeaderIcon>
            <Shield size={20} />
          </HeaderIcon>
          <HeaderText>
            <Heading3>Role Management</Heading3>
            <SmallText style={{ margin: 0, color: 'muted' }}>
              Manage {roles.length} role{roles.length === 1 ? '' : 's'} in this community
            </SmallText>
          </HeaderText>
        </HeaderInfo>
        <Button
          variant="primary"
          onClick={onCreateRole}
          icon={<Plus size={16} />}
        >
          Create Role
        </Button>
      </Header>

      <RoleGrid>
        {roles.map((role) => (
          <RoleCard key={role.id}>
            <RoleHeader>
              <RoleTitle>
                <RoleIcon>
                  <Shield size={16} />
                </RoleIcon>
                <RoleName>{role.name}</RoleName>
              </RoleTitle>
              <RoleActions>
                <ActionButton
                  variant="outline"
                  size="sm"
                  onClick={() => onEditRole?.(role)}
                  icon={<Edit size={14} />}
                >
                  Edit
                </ActionButton>
                {/* TODO: Add delete functionality */}
                <ActionButton
                  variant="outline"
                  size="sm"
                  disabled
                  icon={<Trash2 size={14} />}
                >
                  Delete
                </ActionButton>
              </RoleActions>
            </RoleHeader>

            <RoleDetails>
              <RoleStats>
                <StatItem>
                  <StatValue>{getPermissionCount(role)}</StatValue>
                  <StatLabel>Permissions</StatLabel>
                </StatItem>
                <StatItem>
                  <StatValue>0</StatValue>
                  <StatLabel>Members</StatLabel>
                </StatItem>
              </RoleStats>

              <PermissionList>
                {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                  <PermissionItem key={key}>
                    <span>{label}</span>
                    <PermissionStatus $granted={!!role[key as keyof RoleFromQuery]}>
                      {role[key as keyof RoleFromQuery] ? 'Granted' : 'Denied'}
                    </PermissionStatus>
                  </PermissionItem>
                ))}
              </PermissionList>
            </RoleDetails>
          </RoleCard>
        ))}
      </RoleGrid>
    </Container>
  );
};