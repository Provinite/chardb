import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import { Plus, Copy, Edit2, Trash2, ExternalLink, AlertCircle, Users } from 'lucide-react';
import { 
  useInviteCodesQuery, 
  useCreateInviteCodeMutation, 
  useUpdateInviteCodeMutation,
  useRemoveInviteCodeMutation,
  useRolesByCommunityQuery,
  type InviteCodesQuery,
  type CreateInviteCodeInput,
} from '../graphql/inviteCodes.graphql';
import { useMeQuery } from '../graphql/auth.graphql';
import { LoadingSpinner } from '../components/LoadingSpinner';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl} ${({ theme }) => theme.spacing.md};
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.md};
    align-items: stretch;
  }
`;

const HeaderContent = styled.div`
  flex: 1;
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize.xxl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
`;

const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0;
`;

const CommunityInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.primary + '10'};
  border: 1px solid ${({ theme }) => theme.colors.primary + '30'};
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const CommunityName = styled.span`
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.primary};
`;

const CreateButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: ${({ theme }) => theme.colors.secondary};
    transform: translateY(-1px);
  }
  
  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const InviteCodesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const InviteCodeCard = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border-radius: 12px;
  box-shadow: ${({ theme }) => theme.shadows.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.spacing.lg};
  transition: all 0.2s;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.lg};
  }
`;

const InviteCodeHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const InviteCodeText = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  flex: 1;
`;

const CodeDisplay = styled.code`
  background: ${({ theme }) => theme.colors.surface};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-family: 'JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', monospace;
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  color: ${({ theme }) => theme.colors.secondary};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
`;

const StatusBadge = styled.div<{ $available: boolean }>`
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: 20px;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  background: ${({ $available, theme }) => 
    $available ? theme.colors.success + '20' : theme.colors.error + '20'};
  color: ${({ $available, theme }) => 
    $available ? theme.colors.success : theme.colors.error};
  border: 1px solid ${({ $available, theme }) => 
    $available ? theme.colors.success + '40' : theme.colors.error + '40'};
`;

const RoleBadge = styled.div`
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  background: ${({ theme }) => theme.colors.info + '20'};
  color: ${({ theme }) => theme.colors.info};
  border: 1px solid ${({ theme }) => theme.colors.info + '40'};
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

const InviteCodeMeta = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const MetaItem = styled.div`
  text-align: center;
`;

const MetaLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const MetaValue = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const MetaSubValue = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const InviteCodeActions = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: ${({ theme }) => theme.spacing.md};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const CreatorInfo = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ $variant, theme }) => {
    switch ($variant) {
      case 'primary': return theme.colors.primary;
      case 'danger': return theme.colors.error;
      default: return theme.colors.text.secondary;
    }
  }};
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: ${({ $variant, theme }) => {
      switch ($variant) {
        case 'primary': return theme.colors.primary + '10';
        case 'danger': return theme.colors.error + '10';
        default: return theme.colors.text.secondary + '10';
      }
    }};
    border-color: ${({ $variant, theme }) => {
      switch ($variant) {
        case 'primary': return theme.colors.primary;
        case 'danger': return theme.colors.error;
        default: return theme.colors.text.secondary;
      }
    }};
    transform: translateY(-1px);
  }
  
  &:focus {
    outline: 2px solid ${({ $variant, theme }) => {
      switch ($variant) {
        case 'primary': return theme.colors.primary;
        case 'danger': return theme.colors.error;
        default: return theme.colors.text.secondary;
      }
    }};
    outline-offset: 2px;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xxl};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const EmptyIcon = styled.div`
  font-size: 4rem;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  opacity: 0.5;
`;

const EmptyTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const EmptyDescription = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  margin: 0 0 ${({ theme }) => theme.spacing.lg} 0;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
`;

const ErrorCard = styled.div`
  background: ${({ theme }) => theme.colors.error + '10'};
  border: 1px solid ${({ theme }) => theme.colors.error + '30'};
  border-radius: 12px;
  padding: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const ErrorHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const ErrorTitle = styled.span`
  color: ${({ theme }) => theme.colors.error};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
`;

const ErrorMessage = styled.p`
  color: ${({ theme }) => theme.colors.error};
  margin: 0;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

// Modal components (reusing from site invite codes page pattern)
const Modal = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.md};
  z-index: 50;
`;

const ModalContent = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border-radius: 12px;
  padding: ${({ theme }) => theme.spacing.xl};
  width: 100%;
  max-width: 32rem;
  box-shadow: ${({ theme }) => theme.shadows.lg};
`;

const ModalTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.lg} 0;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const Label = styled.label`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Input = styled.input`
  width: 100%;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.background};
  transition: border-color 0.2s;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary + '20'};
  }
  
  &:disabled {
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text.muted};
    cursor: not-allowed;
  }
`;

const Select = styled.select`
  width: 100%;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.background};
  transition: border-color 0.2s;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary + '20'};
  }
`;

const HelpText = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  margin: 0;
`;

const InfoBox = styled.div`
  background: ${({ theme }) => theme.colors.primary + '10'};
  border: 1px solid ${({ theme }) => theme.colors.primary + '30'};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.md};
`;

const InfoText = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
  
  strong {
    font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  }
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing.md};
  padding-top: ${({ theme }) => theme.spacing.lg};
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.lg};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: all 0.2s;
  
  ${({ $variant, theme }) => {
    if ($variant === 'primary') {
      return `
        background: ${theme.colors.primary};
        color: white;
        border: 1px solid ${theme.colors.primary};
        
        &:hover {
          background: ${theme.colors.secondary};
          border-color: ${theme.colors.secondary};
        }
      `;
    } else {
      return `
        background: ${theme.colors.background};
        color: ${theme.colors.text.primary};
        border: 1px solid ${theme.colors.border};
        
        &:hover {
          background: ${theme.colors.surface};
        }
      `;
    }
  }}
  
  &:focus {
    outline: 2px solid ${({ $variant, theme }) => 
      $variant === 'primary' ? theme.colors.primary : theme.colors.text.secondary};
    outline-offset: 2px;
  }
`;

export function CommunityInviteCodesPage() {
  const { communityId } = useParams<{ communityId: string }>();
  const { data: userData } = useMeQuery();
  
  // Query community invite codes (filtered by communityId)
  const { data, loading, error, refetch } = useInviteCodesQuery({
    variables: { 
      first: 50, 
      communityId: communityId || ''
    },
    skip: !communityId
  });
  
  // Query roles for this community
  const { data: rolesData, loading: rolesLoading } = useRolesByCommunityQuery({
    variables: { communityId: communityId || '' },
    skip: !communityId
  });
  
  const [createInviteCode] = useCreateInviteCodeMutation();
  const [updateInviteCode] = useUpdateInviteCodeMutation();
  const [removeInviteCode] = useRemoveInviteCodeMutation();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCode, setEditingCode] = useState<InviteCodesQuery['inviteCodes']['nodes'][0] | null>(null);

  const copyInviteLink = (code: string) => {
    const inviteUrl = `${window.location.origin}/signup?invite=${code}`;
    navigator.clipboard.writeText(inviteUrl);
  };

  const handleCreateInviteCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userData?.me?.id || !communityId) return;
    
    const formData = new FormData(event.currentTarget);
    const inviteCodeId = formData.get('code') as string || generateRandomCode();
    const maxClaimsStr = formData.get('maxClaims') as string;
    const maxClaims = maxClaimsStr ? parseInt(maxClaimsStr, 10) : 999999;
    const roleId = formData.get('roleId') as string;
    
    const input: CreateInviteCodeInput = {
      id: inviteCodeId,
      creatorId: userData.me.id,
      maxClaims,
      roleId: roleId || undefined,
    };
    
    try {
      await createInviteCode({ variables: { createInviteCodeInput: input } });
      setShowCreateModal(false);
      refetch();
    } catch (error) {
      console.error('Failed to create invite code:', error);
    }
  };

  const handleDeleteInviteCode = async (id: string) => {
    if (!confirm('Are you sure you want to delete this invite code? This action cannot be undone.')) {
      return;
    }
    
    try {
      await removeInviteCode({ variables: { id } });
      refetch();
    } catch (error) {
      console.error('Failed to delete invite code:', error);
    }
  };

  const generateRandomCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  if (!communityId) {
    return (
      <Container>
        <ErrorCard>
          <ErrorHeader>
            <AlertCircle size={20} />
            <ErrorTitle>Invalid Community</ErrorTitle>
          </ErrorHeader>
          <ErrorMessage>No community ID provided in the URL.</ErrorMessage>
        </ErrorCard>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
          <LoadingSpinner size="lg" />
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorCard>
          <ErrorHeader>
            <AlertCircle size={20} />
            <ErrorTitle>Error loading community invite codes</ErrorTitle>
          </ErrorHeader>
          <ErrorMessage>{error.message}</ErrorMessage>
        </ErrorCard>
      </Container>
    );
  }

  const inviteCodes = data?.inviteCodes?.nodes || [];
  const roles = rolesData?.rolesByCommunity?.nodes || [];
  const communityName = roles[0]?.community?.name || `Community ${communityId}`;

  return (
    <Container>
      <Header>
        <HeaderContent>
          <Title>Community Invite Codes</Title>
          <Subtitle>Manage invitation codes for community members</Subtitle>
          <CommunityInfo>
            <Users size={20} />
            <CommunityName>{communityName}</CommunityName>
          </CommunityInfo>
        </HeaderContent>
        <CreateButton onClick={() => setShowCreateModal(true)}>
          <Plus size={20} />
          Create Invite Code
        </CreateButton>
      </Header>

      {inviteCodes.length > 0 ? (
        <InviteCodesGrid>
          {inviteCodes.map((inviteCode) => (
            <InviteCodeCard key={inviteCode.id}>
              <InviteCodeHeader>
                <InviteCodeText>
                  <CodeDisplay>{inviteCode.id}</CodeDisplay>
                  <ActionButton
                    onClick={() => copyInviteLink(inviteCode.id)}
                    title="Copy invite link"
                    $variant="secondary"
                  >
                    <Copy size={16} />
                  </ActionButton>
                </InviteCodeText>
                <StatusBadge $available={inviteCode.isAvailable}>
                  {inviteCode.isAvailable ? 'Available' : 'Exhausted'}
                </StatusBadge>
              </InviteCodeHeader>

              {inviteCode.role && (
                <RoleBadge>
                  Role: {inviteCode.role.name}
                </RoleBadge>
              )}

              <InviteCodeMeta>
                <MetaItem>
                  <MetaLabel>Usage</MetaLabel>
                  <MetaValue>{inviteCode.claimCount}/{inviteCode.maxClaims}</MetaValue>
                  <MetaSubValue>{inviteCode.remainingClaims} remaining</MetaSubValue>
                </MetaItem>
                <MetaItem>
                  <MetaLabel>Created</MetaLabel>
                  <MetaValue>{new Date(inviteCode.createdAt).toLocaleDateString()}</MetaValue>
                  <MetaSubValue>{new Date(inviteCode.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</MetaSubValue>
                </MetaItem>
              </InviteCodeMeta>

              <InviteCodeActions>
                <CreatorInfo>
                  by {inviteCode.creator.displayName || inviteCode.creator.username}
                </CreatorInfo>
                <ActionButtons>
                  <ActionButton
                    onClick={() => copyInviteLink(inviteCode.id)}
                    title="Copy invite link"
                    $variant="primary"
                  >
                    <ExternalLink size={16} />
                  </ActionButton>
                  <ActionButton
                    onClick={() => setEditingCode(inviteCode)}
                    title="Edit invite code"
                  >
                    <Edit2 size={16} />
                  </ActionButton>
                  <ActionButton
                    onClick={() => handleDeleteInviteCode(inviteCode.id)}
                    title="Delete invite code"
                    $variant="danger"
                  >
                    <Trash2 size={16} />
                  </ActionButton>
                </ActionButtons>
              </InviteCodeActions>
            </InviteCodeCard>
          ))}
        </InviteCodesGrid>
      ) : (
        <EmptyState>
          <EmptyIcon>🎫</EmptyIcon>
          <EmptyTitle>No community invite codes yet</EmptyTitle>
          <EmptyDescription>
            Create invite codes to allow new users to join your community with assigned roles.
          </EmptyDescription>
          <CreateButton onClick={() => setShowCreateModal(true)}>
            <Plus size={20} />
            Create Your First Invite Code
          </CreateButton>
        </EmptyState>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <Modal>
          <ModalContent>
            <ModalTitle>Create Community Invite Code</ModalTitle>
            <Form onSubmit={handleCreateInviteCode}>
              <FormGroup>
                <Label>Invite Code</Label>
                <Input
                  name="code"
                  type="text"
                  placeholder="WELCOME2024"
                  pattern="[A-Za-z0-9\-_]+"
                />
                <HelpText>Leave blank to auto-generate. Only letters, numbers, hyphens, and underscores allowed.</HelpText>
              </FormGroup>

              <FormGroup>
                <Label>Assign Role</Label>
                <Select name="roleId" required>
                  <option value="">Select a role...</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </Select>
                <HelpText>New members will be assigned this role when they use the invite code.</HelpText>
                {rolesLoading && <HelpText>Loading available roles...</HelpText>}
              </FormGroup>

              <FormGroup>
                <Label>Usage Limit</Label>
                <Input
                  name="maxClaims"
                  type="number"
                  placeholder="50"
                  min="1"
                  max="999999"
                />
                <HelpText>Leave blank for maximum limit (999,999 uses)</HelpText>
              </FormGroup>

              <InfoBox>
                <InfoText>
                  <strong>Community Invite Code:</strong> This code will allow users to join {communityName} with the selected role.
                </InfoText>
              </InfoBox>

              <ModalActions>
                <Button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  $variant="primary"
                  disabled={rolesLoading || roles.length === 0}
                >
                  Create Invite Code
                </Button>
              </ModalActions>
            </Form>
          </ModalContent>
        </Modal>
      )}

      {/* Edit Modal */}
      {editingCode && (
        <Modal>
          <ModalContent>
            <ModalTitle>Edit Invite Code</ModalTitle>
            <Form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const maxClaimsStr = formData.get('maxClaims') as string;
              const maxClaims = maxClaimsStr ? parseInt(maxClaimsStr, 10) : editingCode.maxClaims;
              
              try {
                await updateInviteCode({ 
                  variables: { 
                    id: editingCode.id, 
                    updateInviteCodeInput: { maxClaims } 
                  } 
                });
                setEditingCode(null);
                refetch();
              } catch (error) {
                console.error('Failed to update invite code:', error);
              }
            }}>
              <FormGroup>
                <Label>Invite Code</Label>
                <Input
                  type="text"
                  value={editingCode.id}
                  disabled
                />
                <HelpText>Invite code cannot be changed after creation</HelpText>
              </FormGroup>

              <FormGroup>
                <Label>Current Role Assignment</Label>
                <Input
                  type="text"
                  value={editingCode.role?.name || 'No role assigned'}
                  disabled
                />
                <HelpText>Role assignment cannot be changed after creation</HelpText>
              </FormGroup>

              <FormGroup>
                <Label>Usage Limit</Label>
                <Input
                  name="maxClaims"
                  type="number"
                  defaultValue={editingCode.maxClaims}
                  min={editingCode.claimCount}
                  max="999999"
                />
                <HelpText>
                  Cannot be set below current usage ({editingCode.claimCount})
                </HelpText>
              </FormGroup>

              <ModalActions>
                <Button
                  type="button"
                  onClick={() => setEditingCode(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  $variant="primary"
                >
                  Update Invite Code
                </Button>
              </ModalActions>
            </Form>
          </ModalContent>
        </Modal>
      )}
    </Container>
  );
}