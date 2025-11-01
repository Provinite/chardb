import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import { 
  Users, 
  Shield, 
  Search, 
  Check,
  X,
  Crown
} from 'lucide-react';
import {
  useCommunityMembersWithRolesQuery,
  useRolesByCommunityDetailedQuery,
  useUpdateCommunityMemberMutation
} from '../../generated/graphql';

/**
 * Permission Matrix Component
 * 
 * Displays a comprehensive grid view of community members and their role-based permissions.
 * Provides quick role assignment and permission visibility at a glance.
 * 
 * Features:
 * - Grid layout with users as rows and permissions as columns
 * - Quick role switching via dropdown
 * - Search and filter functionality
 * - Real-time permission updates
 * - Visual permission indicators
 * - Responsive design with scroll optimization
 */

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
`;

const Title = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const TitleIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.primary}20;
  color: ${({ theme }) => theme.colors.primary};
`;

const TitleText = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
`;

const SearchContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const SearchInput = styled.input`
  padding: 0.5rem 0.75rem 0.5rem 2.5rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.875rem;
  min-width: 250px;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary}20;
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 0.75rem;
  color: ${({ theme }) => theme.colors.text.muted};
  pointer-events: none;
`;

const MatrixContainer = styled.div`
  overflow: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.background};
`;

const MatrixTable = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.875rem;
`;

const MatrixHeader = styled.thead`
  background: ${({ theme }) => theme.colors.surface};
  position: sticky;
  top: 0;
  z-index: 2;
`;

const HeaderRow = styled.tr`
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
`;

const HeaderCell = styled.th<{ $sticky?: boolean; $width?: string }>`
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
  width: ${({ $width }) => $width || 'auto'};
  
  ${({ $sticky, theme }) => $sticky && `
    position: sticky;
    left: 0;
    z-index: 3;
    background: ${theme.colors.surface};
  `}
  
  &:last-child {
    border-right: none;
  }
`;

const PermissionHeader = styled(HeaderCell)`
  text-align: center;
  min-width: 80px;
`;

const MatrixBody = styled.tbody``;

const MatrixRow = styled.tr`
  &:nth-child(even) {
    background: ${({ theme }) => theme.colors.surface}40;
  }
  
  &:hover {
    background: ${({ theme }) => theme.colors.primary}10;
  }
  
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const UserCell = styled.td<{ $sticky?: boolean }>`
  padding: 0.75rem;
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  
  ${({ $sticky, theme }) => $sticky && `
    position: sticky;
    left: 0;
    z-index: 2;
    background: ${theme.colors.background};
    
    /* Ensure proper clipping with a box shadow to create visual separation */
    box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1);
    
    /* Handle row striping background inheritance */
    tr:nth-child(even) & {
      background: ${theme.colors.surface}40;
    }
    
    tr:hover & {
      background: ${theme.colors.primary}10;
    }
  `}
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 200px;
`;

const UserAvatar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary}20;
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 600;
  font-size: 0.875rem;
`;

const UserDetails = styled.div`
  display: flex;
  flex-direction: column;
`;

const UserName = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const UserEmail = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const RoleCell = styled.td`
  padding: 0.75rem;
  border-right: 1px solid ${({ theme }) => theme.colors.border};
`;

const RoleSelect = styled.select`
  padding: 0.375rem 0.5rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.75rem;
  min-width: 120px;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const PermissionCell = styled.td`
  padding: 0.75rem;
  text-align: center;
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  
  &:last-child {
    border-right: none;
  }
`;

const PermissionIcon = styled.div<{ $granted: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 4px;
  background: ${({ $granted, theme }) => 
    $granted ? theme.colors.success : theme.colors.surface};
  color: ${({ $granted, theme }) => 
    $granted ? 'white' : theme.colors.text.muted};
  
  transition: all 0.2s ease;
`;

const StatsContainer = styled.div`
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
`;

const Stat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const StatLabel = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.muted};
  font-weight: 500;
`;

const StatValue = styled.span`
  font-size: 1.125rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

interface PermissionMatrixProps {
  communityId: string;
}

// Define permission labels for display
const PERMISSION_LABELS = {
  canCreateSpecies: 'Create Species',
  canCreateCharacter: 'Create Character',
  canCreateOrphanedCharacter: 'Create Orphaned Characters',
  canEditCharacter: 'Edit Characters',
  canEditOwnCharacter: 'Edit Own Characters',
  canEditSpecies: 'Edit Species',
  canManageItems: 'Manage Items',
  canGrantItems: 'Grant Items',
  canCreateInviteCode: 'Create Invites',
  canListInviteCodes: 'List Invites',
  canCreateRole: 'Create Roles',
  canEditRole: 'Edit Roles',
  canRemoveCommunityMember: 'Remove Members',
  canManageMemberRoles: 'Manage Member Roles'
} as const;

export const PermissionMatrix: React.FC<PermissionMatrixProps> = ({ communityId }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch community members with their roles
  const { 
    data: membersData, 
    loading: membersLoading, 
    error: membersError,
    refetch: refetchMembers 
  } = useCommunityMembersWithRolesQuery({
    variables: { communityId, first: 100, after: null },
    skip: !communityId,
  });

  // Fetch all roles for the community
  const { 
    data: rolesData, 
    loading: rolesLoading 
  } = useRolesByCommunityDetailedQuery({
    variables: { communityId, first: 100, after: null },
    skip: !communityId,
  });

  // Update community member mutation
  const [updateCommunityMember, { loading: updating }] = useUpdateCommunityMemberMutation();

  const members = membersData?.communityMembersByCommunity?.nodes || [];
  const roles = rolesData?.rolesByCommunity?.nodes || [];

  // Filter members based on search term
  const filteredMembers = useMemo(() => {
    if (!searchTerm.trim()) return members;
    
    const term = searchTerm.toLowerCase();
    return members.filter(member => {
      const user = member.user;
      const role = member.role;
      return (
        user?.username?.toLowerCase().includes(term) ||
        user?.displayName?.toLowerCase().includes(term) ||
        user?.email?.toLowerCase().includes(term) ||
        role?.name?.toLowerCase().includes(term)
      );
    });
  }, [members, searchTerm]);

  // Handle role change
  const handleRoleChange = async (memberId: string, newRoleId: string) => {
    try {
      await updateCommunityMember({
        variables: {
          id: memberId,
          input: { roleId: newRoleId }
        }
      });
      
      // Refetch to ensure data consistency
      await refetchMembers();
    } catch (error) {
      console.error('Failed to update member role:', error);
      // TODO: Show error toast
    }
  };

  // Get user initials for avatar
  const getUserInitials = (user: any) => {
    if (user?.displayName) {
      return user.displayName.split(' ').map((name: string) => name[0]).join('').toUpperCase().substring(0, 2);
    }
    return user?.username?.[0]?.toUpperCase() || '?';
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const totalMembers = members.length;
    const roleDistribution = roles.reduce((acc, role) => {
      acc[role.id] = members.filter(m => m.roleId === role.id).length;
      return acc;
    }, {} as Record<string, number>);
    
    return { totalMembers, roleDistribution };
  }, [members, roles]);

  if (membersLoading || rolesLoading) {
    return (
      <Container>
        <Header>
          <Title>
            <TitleIcon>
              <Shield size={20} />
            </TitleIcon>
            <div>
              <TitleText>Permission Matrix</TitleText>
              <Subtitle>Loading member permissions...</Subtitle>
            </div>
          </Title>
        </Header>
      </Container>
    );
  }

  if (membersError) {
    return (
      <Container>
        <Header>
          <Title>
            <TitleIcon>
              <Shield size={20} />
            </TitleIcon>
            <div>
              <TitleText>Permission Matrix</TitleText>
              <Subtitle>Error loading permissions</Subtitle>
            </div>
          </Title>
        </Header>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>
          <TitleIcon>
            <Shield size={20} />
          </TitleIcon>
          <div>
            <TitleText>Permission Matrix</TitleText>
            <Subtitle>Manage member roles and view permission overview</Subtitle>
          </div>
        </Title>

        <Controls>
          <SearchContainer>
            <SearchIcon>
              <Search size={16} />
            </SearchIcon>
            <SearchInput
              type="text"
              placeholder="Search members by name, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </SearchContainer>
        </Controls>
      </Header>

      <StatsContainer>
        <Stat>
          <StatLabel>Total Members</StatLabel>
          <StatValue>{stats.totalMembers}</StatValue>
        </Stat>
        {roles.map(role => (
          <Stat key={role.id}>
            <StatLabel>{role.name}</StatLabel>
            <StatValue>{stats.roleDistribution[role.id] || 0}</StatValue>
          </Stat>
        ))}
      </StatsContainer>

      <MatrixContainer>
        <MatrixTable>
          <MatrixHeader>
            <HeaderRow>
              <HeaderCell $sticky $width="250px">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={16} />
                  Member
                </div>
              </HeaderCell>
              <HeaderCell $width="140px">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Crown size={16} />
                  Role
                </div>
              </HeaderCell>
              {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                <PermissionHeader key={key}>
                  {label}
                </PermissionHeader>
              ))}
            </HeaderRow>
          </MatrixHeader>
          
          <MatrixBody>
            {filteredMembers.map((member) => (
              <MatrixRow key={member.id}>
                <UserCell $sticky>
                  <UserInfo>
                    <UserAvatar>
                      {getUserInitials(member.user)}
                    </UserAvatar>
                    <UserDetails>
                      <UserName>{member.user?.displayName || member.user?.username}</UserName>
                      <UserEmail>{member.user?.email}</UserEmail>
                    </UserDetails>
                  </UserInfo>
                </UserCell>
                
                <RoleCell>
                  <RoleSelect
                    value={member.roleId}
                    onChange={(e) => handleRoleChange(member.id, e.target.value)}
                    disabled={updating}
                  >
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </RoleSelect>
                </RoleCell>
                
                {Object.keys(PERMISSION_LABELS).map((permission) => (
                  <PermissionCell key={permission}>
                    <PermissionIcon $granted={!!member.role?.[permission as keyof typeof PERMISSION_LABELS]}>
                      {member.role?.[permission as keyof typeof PERMISSION_LABELS] ? (
                        <Check size={12} />
                      ) : (
                        <X size={12} />
                      )}
                    </PermissionIcon>
                  </PermissionCell>
                ))}
              </MatrixRow>
            ))}
          </MatrixBody>
        </MatrixTable>
      </MatrixContainer>
    </Container>
  );
};