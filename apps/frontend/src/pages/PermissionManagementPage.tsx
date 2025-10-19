import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import { Shield, Users, Settings, Plus, ArrowLeft } from 'lucide-react';
import { Button, Heading2, SmallText, HelpText } from '@chardb/ui';
import { PermissionMatrix } from '../components/admin/PermissionMatrix';
import { RoleEditor } from '../components/admin/RoleEditor';
import { RoleManagementTab } from '../components/admin/RoleManagementTab';
import {
  useRolesByCommunityDetailedQuery,
  RolesByCommunityDetailedQuery,
} from '../generated/graphql';

/**
 * Permission Management Page
 *
 * Comprehensive permission and role management interface for community administrators.
 * Integrates all permission management components in a tabbed interface.
 *
 * Features:
 * - Permission matrix for member overview
 * - Role creation and editing
 * - Role template management
 * - Bulk permission operations
 * - Community-scoped access control
 */

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const HeaderTop = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const BackButton = styled(Button)`
  padding: 0.5rem;
`;

const HeaderContent = styled.div`
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
  width: 3rem;
  height: 3rem;
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.primary}20;
  color: ${({ theme }) => theme.colors.primary};
`;

const HeaderText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const TabContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const TabBar = styled.div`
  display: flex;
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  gap: 0;
`;

const Tab = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  background: none;
  color: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.text.muted};
  font-weight: ${({ $active }) => ($active ? '600' : '500')};
  font-size: 0.875rem;
  cursor: pointer;
  border-bottom: 2px solid
    ${({ theme, $active }) => ($active ? theme.colors.primary : 'transparent')};
  transition: all 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.primary}05;
  }
`;

const TabContent = styled.div`
  min-height: 400px;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 1rem;
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 1rem;
  text-align: center;
`;

type TabType = 'overview' | 'roles';

export const PermissionManagementPage: React.FC = () => {
  const { communityId } = useParams<{ communityId: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showRoleEditor, setShowRoleEditor] = useState(false);
  const [editingRole, setEditingRole] = useState<
    | NonNullable<RolesByCommunityDetailedQuery['rolesByCommunity']>['nodes'][0]
    | null
  >(null);

  // Fetch roles for the community
  const {
    data: rolesData,
    loading: rolesLoading,
    error: rolesError,
    refetch: refetchRoles,
  } = useRolesByCommunityDetailedQuery({
    variables: { communityId: communityId!, first: 100, after: null },
    skip: !communityId,
  });

  if (!communityId) {
    return (
      <ErrorContainer>
        <Shield size={48} />
        <Heading2>Invalid Community</Heading2>
        <HelpText>Community ID is required to manage permissions.</HelpText>
      </ErrorContainer>
    );
  }

  if (rolesError) {
    return (
      <ErrorContainer>
        <Shield size={48} />
        <Heading2>Access Denied</Heading2>
        <HelpText>
          You don't have permission to manage roles in this community.
        </HelpText>
      </ErrorContainer>
    );
  }

  const handleRoleCreated = () => {
    refetchRoles();
    setShowRoleEditor(false);
    setEditingRole(null);
  };

  const communityName =
    rolesData?.rolesByCommunity?.nodes?.[0]?.community?.name || 'Community';
  const totalRoles = rolesData?.rolesByCommunity?.totalCount || 0;

  return (
    <Container>
      <Header>
        <HeaderTop>
          <BackButton
            variant="outline"
            onClick={() => window.history.back()}
            icon={<ArrowLeft size={16} />}
          >
            Back
          </BackButton>
        </HeaderTop>

        <HeaderContent>
          <HeaderInfo>
            <HeaderIcon>
              <Shield size={24} />
            </HeaderIcon>
            <HeaderText>
              <Heading2>Permission Management</Heading2>
              <SmallText style={{ margin: 0, color: 'muted' }}>
                Manage roles and permissions for {communityName} • {totalRoles}{' '}
                roles
              </SmallText>
            </HeaderText>
          </HeaderInfo>

          <HeaderActions>
            <Button
              variant="primary"
              onClick={() => setShowRoleEditor(true)}
              icon={<Plus size={16} />}
            >
              Create Role
            </Button>
          </HeaderActions>
        </HeaderContent>
      </Header>

      <TabContainer>
        <TabBar>
          <Tab
            $active={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
          >
            <Users size={16} />
            Member Overview
          </Tab>
          <Tab
            $active={activeTab === 'roles'}
            onClick={() => setActiveTab('roles')}
          >
            <Settings size={16} />
            Role Management
          </Tab>
        </TabBar>

        <TabContent>
          {rolesLoading ? (
            <LoadingContainer>
              <Shield size={32} />
              <SmallText>Loading permission data...</SmallText>
            </LoadingContainer>
          ) : (
            <>
              {activeTab === 'overview' && (
                <PermissionMatrix communityId={communityId} />
              )}

              {activeTab === 'roles' && (
                <RoleManagementTab
                  communityId={communityId}
                  onEditRole={(role) => {
                    setEditingRole(role);
                    setShowRoleEditor(true);
                  }}
                  onCreateRole={() => setShowRoleEditor(true)}
                />
              )}
            </>
          )}
        </TabContent>
      </TabContainer>

      {/* Role Editor Modal */}
      <RoleEditor
        isOpen={showRoleEditor}
        onClose={() => {
          setShowRoleEditor(false);
          setEditingRole(null);
        }}
        onSuccess={handleRoleCreated}
        communityId={communityId}
        editingRole={editingRole}
      />
    </Container>
  );
};
